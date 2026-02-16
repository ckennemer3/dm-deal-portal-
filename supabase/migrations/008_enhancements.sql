-- ============================================
-- Migration 008: Enhancement Tables & Columns
-- New: deal_views, audit_log, notifications, kickback_reasons
-- New columns on deals: claimed_at, completed_at, last_activity_at, kickback_count
-- Triggers for automated tracking
-- Reporting views (v_deal_metrics, v_response_times, v_kickback_analytics)
-- ============================================

-- ============================================
-- 1. NEW COLUMNS ON DEALS
-- ============================================

ALTER TABLE deals ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE deals ADD COLUMN IF NOT EXISTS kickback_count INTEGER NOT NULL DEFAULT 0;

-- ============================================
-- 2. NEW TABLES
-- ============================================

-- deal_views: tracks when each user last viewed each deal (for unread detection)
CREATE TABLE IF NOT EXISTS deal_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, deal_id)
);
CREATE INDEX IF NOT EXISTS idx_deal_views_user_deal ON deal_views(user_id, deal_id);

-- audit_log: immutable log of all deal actions after initial submission
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'document_uploaded', 'document_replaced', 'document_deleted',
    'deal_kicked_back', 'deal_resubmitted', 'status_changed',
    'field_changed', 'message_sent', 'action_required_resolved',
    'deal_claimed', 'deal_reassigned'
  )),
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_deal_created ON audit_log(deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action_type ON audit_log(action_type);

-- notifications: in-app notifications for real-time toast popups
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  deal_number TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- Enable Supabase Realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- kickback_reasons: normalized kickback reason tracking for reporting
CREATE TABLE IF NOT EXISTS kickback_reasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  kicked_by_user_id UUID NOT NULL REFERENCES users(id),
  kicked_to_user_id UUID REFERENCES users(id),
  reason_category TEXT NOT NULL CHECK (reason_category IN (
    'poor_deal_information', 'incomplete_application', 'ltv_too_high',
    'missing_documents', 'incorrect_numbers', 'missing_stipulations', 'other'
  )),
  reason_detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_kickback_reasons_deal ON kickback_reasons(deal_id);
CREATE INDEX IF NOT EXISTS idx_kickback_reasons_category ON kickback_reasons(reason_category);

-- ============================================
-- 3. TRIGGERS FOR AUTOMATED TRACKING
-- ============================================

-- Auto-update last_activity_at on deals when sub-tables change
CREATE OR REPLACE FUNCTION update_deal_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE deals SET last_activity_at = NOW() WHERE id = NEW.deal_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_deal_messages_activity
  AFTER INSERT ON deal_messages FOR EACH ROW
  EXECUTE FUNCTION update_deal_last_activity();

CREATE TRIGGER tr_deal_documents_activity
  AFTER INSERT ON deal_documents FOR EACH ROW
  EXECUTE FUNCTION update_deal_last_activity();

CREATE TRIGGER tr_deal_status_history_activity
  AFTER INSERT ON deal_status_history FOR EACH ROW
  EXECUTE FUNCTION update_deal_last_activity();

CREATE TRIGGER tr_deal_field_changes_activity
  AFTER INSERT ON deal_field_changes FOR EACH ROW
  EXECUTE FUNCTION update_deal_last_activity();

CREATE TRIGGER tr_deal_assignments_activity
  AFTER INSERT ON deal_assignments FOR EACH ROW
  EXECUTE FUNCTION update_deal_last_activity();

-- Auto-set completed_at when status becomes terminal
CREATE OR REPLACE FUNCTION set_deal_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('signed_and_delivered', 'cancelled') AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_deals_set_completed_at
  BEFORE UPDATE ON deals FOR EACH ROW
  EXECUTE FUNCTION set_deal_completed_at();

-- Auto-set claimed_at when assigned_underwriter set from NULL
CREATE OR REPLACE FUNCTION set_deal_claimed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.assigned_underwriter IS NULL AND NEW.assigned_underwriter IS NOT NULL THEN
    NEW.claimed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_deals_set_claimed_at
  BEFORE UPDATE ON deals FOR EACH ROW
  EXECUTE FUNCTION set_deal_claimed_at();

-- Auto-increment kickback_count on kickback status transitions
CREATE OR REPLACE FUNCTION increment_deal_kickback_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('kicked_back_to_manager', 'kicked_back_to_sales')
     AND OLD.status NOT IN ('kicked_back_to_manager', 'kicked_back_to_sales') THEN
    NEW.kickback_count = COALESCE(OLD.kickback_count, 0) + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_deals_increment_kickback
  BEFORE UPDATE ON deals FOR EACH ROW
  EXECUTE FUNCTION increment_deal_kickback_count();

-- ============================================
-- 4. BACKFILL EXISTING DATA
-- ============================================

-- Backfill last_activity_at from updated_at
UPDATE deals SET last_activity_at = updated_at WHERE last_activity_at IS NULL;

-- Backfill completed_at from deal_status_history
UPDATE deals d SET completed_at = (
  SELECT MIN(h.changed_at) FROM deal_status_history h
  WHERE h.deal_id = d.id AND h.to_status IN ('signed_and_delivered', 'cancelled')
)
WHERE d.status IN ('signed_and_delivered', 'cancelled') AND d.completed_at IS NULL;

-- Backfill claimed_at from deal_assignments
UPDATE deals d SET claimed_at = (
  SELECT MIN(a.assigned_at) FROM deal_assignments a
  WHERE a.deal_id = d.id AND a.assignment_type = 'underwriter_claim'
)
WHERE d.assigned_underwriter IS NOT NULL AND d.claimed_at IS NULL;

-- Backfill kickback_count from deal_status_history
UPDATE deals d SET kickback_count = COALESCE((
  SELECT COUNT(*) FROM deal_status_history h
  WHERE h.deal_id = d.id AND h.to_status IN ('kicked_back_to_manager', 'kicked_back_to_sales')
), 0);

-- ============================================
-- 5. RLS POLICIES FOR NEW TABLES
-- ============================================

ALTER TABLE deal_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE kickback_reasons ENABLE ROW LEVEL SECURITY;

-- deal_views: users can read/upsert their own
CREATE POLICY "Users can view own deal_views"
  ON deal_views FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own deal_views"
  ON deal_views FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own deal_views"
  ON deal_views FOR UPDATE USING (user_id = auth.uid());

-- audit_log: inherits deal visibility (if you can see the deal, you can see its log)
CREATE POLICY "View audit_log for visible deals"
  ON audit_log FOR SELECT USING (deal_id IN (SELECT id FROM deals));
CREATE POLICY "Insert audit_log for visible deals"
  ON audit_log FOR INSERT WITH CHECK (deal_id IN (SELECT id FROM deals));

-- notifications: users can read/update their own
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Authenticated can insert notifications"
  ON notifications FOR INSERT WITH CHECK (true);

-- kickback_reasons: inherits deal visibility
CREATE POLICY "View kickback_reasons for visible deals"
  ON kickback_reasons FOR SELECT USING (deal_id IN (SELECT id FROM deals));
CREATE POLICY "Insert kickback_reasons for visible deals"
  ON kickback_reasons FOR INSERT WITH CHECK (deal_id IN (SELECT id FROM deals));

-- ============================================
-- 6. REPORTING VIEWS (DB-level aggregation)
-- ============================================

-- v_deal_metrics: deals pre-joined with primary applicant credit score and computed LTV
CREATE OR REPLACE VIEW v_deal_metrics AS
SELECT
  d.id AS deal_id,
  d.deal_number,
  d.deal_type,
  d.status,
  d.submitted_by,
  d.assigned_manager,
  d.assigned_underwriter,
  d.vehicle_condition,
  d.created_at,
  d.updated_at,
  d.completed_at,
  d.claimed_at,
  d.last_activity_at,
  d.kickback_count,
  d.monthly_payment,
  d.term,
  -- Primary applicant credit score (applicant_number = 1)
  pa.experian_score AS primary_credit_score,
  -- Financing amount (net_cap_cost for lease/re-lease, total_amount_financed for retail/buyout)
  CASE
    WHEN d.deal_type IN ('lease', 're_lease') THEN d.net_cap_cost
    ELSE d.total_amount_financed
  END AS financing_amount,
  -- Retail LTV: financing / (jd_power_retail for used, msrp for new/demo) * 100
  CASE
    WHEN d.vehicle_condition = 'used' AND d.jd_power_retail > 0 THEN
      ROUND(
        (CASE WHEN d.deal_type IN ('lease','re_lease') THEN d.net_cap_cost ELSE d.total_amount_financed END)
        / d.jd_power_retail * 100, 1
      )
    WHEN d.vehicle_condition IN ('new','untitled_demo') AND d.msrp > 0 THEN
      ROUND(
        (CASE WHEN d.deal_type IN ('lease','re_lease') THEN d.net_cap_cost ELSE d.total_amount_financed END)
        / d.msrp * 100, 1
      )
    ELSE NULL
  END AS retail_ltv,
  -- Wholesale LTV: financing / (jd_power_wholesale for used, invoice for new/demo) * 100
  CASE
    WHEN d.vehicle_condition = 'used' AND d.jd_power_wholesale > 0 THEN
      ROUND(
        (CASE WHEN d.deal_type IN ('lease','re_lease') THEN d.net_cap_cost ELSE d.total_amount_financed END)
        / d.jd_power_wholesale * 100, 1
      )
    WHEN d.vehicle_condition IN ('new','untitled_demo') AND d.invoice > 0 THEN
      ROUND(
        (CASE WHEN d.deal_type IN ('lease','re_lease') THEN d.net_cap_cost ELSE d.total_amount_financed END)
        / d.invoice * 100, 1
      )
    ELSE NULL
  END AS wholesale_ltv,
  -- Lifecycle hours: created to completed (NULL if not completed)
  CASE
    WHEN d.completed_at IS NOT NULL THEN
      ROUND(EXTRACT(EPOCH FROM (d.completed_at - d.created_at)) / 3600.0, 1)
    ELSE NULL
  END AS lifecycle_hours,
  -- Deal age in hours (from created to now)
  ROUND(EXTRACT(EPOCH FROM (NOW() - d.created_at)) / 3600.0, 1) AS age_hours,
  -- Submitter info
  su.first_name AS submitter_first_name,
  su.last_name AS submitter_last_name,
  su.team_id AS submitter_team_id,
  -- Manager info
  mu.first_name AS manager_first_name,
  mu.last_name AS manager_last_name,
  -- UW info
  uu.first_name AS uw_first_name,
  uu.last_name AS uw_last_name,
  -- Office (via submitter's team)
  t.office_id AS submitter_office_id,
  o.name AS office_name
FROM deals d
LEFT JOIN deal_applicants pa ON pa.deal_id = d.id AND pa.applicant_number = 1
LEFT JOIN users su ON su.id = d.submitted_by
LEFT JOIN users mu ON mu.id = d.assigned_manager
LEFT JOIN users uu ON uu.id = d.assigned_underwriter
LEFT JOIN teams t ON t.id = su.team_id
LEFT JOIN offices o ON o.id = t.office_id;

-- v_response_times: status transition durations from deal_status_history
CREATE OR REPLACE VIEW v_response_times AS
SELECT
  h.id AS transition_id,
  h.deal_id,
  d.deal_number,
  d.submitted_by,
  d.assigned_manager,
  d.assigned_underwriter,
  h.from_status,
  h.to_status,
  h.changed_by,
  h.changed_at,
  h.kickback_reason,
  -- Time spent in the from_status (hours) — from previous transition to this one
  CASE
    WHEN prev_h.changed_at IS NOT NULL THEN
      ROUND(EXTRACT(EPOCH FROM (h.changed_at - prev_h.changed_at)) / 3600.0, 2)
    ELSE
      ROUND(EXTRACT(EPOCH FROM (h.changed_at - d.created_at)) / 3600.0, 2)
  END AS hours_in_status,
  -- Date dimensions for grouping
  DATE(h.changed_at) AS transition_date,
  DATE_TRUNC('week', h.changed_at) AS transition_week,
  DATE_TRUNC('month', h.changed_at) AS transition_month
FROM deal_status_history h
JOIN deals d ON d.id = h.deal_id
LEFT JOIN LATERAL (
  SELECT changed_at FROM deal_status_history ph
  WHERE ph.deal_id = h.deal_id AND ph.changed_at < h.changed_at
  ORDER BY ph.changed_at DESC LIMIT 1
) prev_h ON true;

-- v_kickback_analytics: kickback data with user/office info for aggregation
CREATE OR REPLACE VIEW v_kickback_analytics AS
SELECT
  d.id AS deal_id,
  d.deal_number,
  d.submitted_by,
  d.assigned_manager,
  d.deal_type,
  d.kickback_count,
  d.created_at,
  su.team_id AS agent_team_id,
  t.office_id AS agent_office_id,
  o.name AS office_name,
  su.first_name AS agent_first_name,
  su.last_name AS agent_last_name,
  mu.first_name AS manager_first_name,
  mu.last_name AS manager_last_name
FROM deals d
LEFT JOIN users su ON su.id = d.submitted_by
LEFT JOIN users mu ON mu.id = d.assigned_manager
LEFT JOIN teams t ON t.id = su.team_id
LEFT JOIN offices o ON o.id = t.office_id
WHERE d.kickback_count > 0 OR d.status NOT IN ('pending');
