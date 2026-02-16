-- ============================================
-- Migration 009: Kickback Response Tracking
-- Adds response fields to kickback_reasons table
-- for the kickback banner / response workflow.
-- ============================================

-- Add response and resolution columns to kickback_reasons
ALTER TABLE kickback_reasons ADD COLUMN IF NOT EXISTS response_text TEXT;
ALTER TABLE kickback_reasons ADD COLUMN IF NOT EXISTS responded_by UUID REFERENCES users(id);
ALTER TABLE kickback_reasons ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;
ALTER TABLE kickback_reasons ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE kickback_reasons ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- Index for efficient lookups of unresolved kickbacks per deal
CREATE INDEX IF NOT EXISTS idx_kickback_reasons_deal_unresolved
  ON kickback_reasons(deal_id, is_resolved)
  WHERE is_resolved = false;

-- Extend audit_log action_type CHECK to include 'kickback_responded'
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_type_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_action_type_check
  CHECK (action_type IN (
    'document_uploaded', 'document_replaced', 'document_deleted',
    'deal_kicked_back', 'deal_resubmitted', 'status_changed',
    'field_changed', 'message_sent', 'action_required_resolved',
    'deal_claimed', 'deal_reassigned', 'kickback_responded'
  ));
