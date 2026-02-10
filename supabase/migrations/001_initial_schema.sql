-- ============================================
-- D&M Deal Portal — Complete Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Offices
CREATE TABLE offices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Teams
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  manager_id UUID, -- FK added after users table
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, office_id)
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('agent', 'manager', 'underwriter', 'executive', 'administrator')),
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  primary_office_id UUID REFERENCES offices(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add manager FK to teams now that users exists
ALTER TABLE teams ADD CONSTRAINT fk_teams_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;

-- Deal number sequence
CREATE SEQUENCE deal_number_seq START 1;

-- Deals
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_number TEXT NOT NULL UNIQUE,
  deal_type TEXT NOT NULL CHECK (deal_type IN ('lease', 'retail_purchase', 're_lease', 'lease_buyout')),
  status TEXT NOT NULL DEFAULT 'submitted_to_manager' CHECK (status IN (
    'submitted_to_manager', 'manager_reviewing', 'sent_to_underwriting',
    'underwriting_assigned', 'underwriting_reviewing',
    'kicked_back_to_manager', 'kicked_back_to_agent',
    'resubmitted_to_manager', 'resubmitted_to_underwriting',
    'completed', 'cancelled'
  )),
  submitted_by UUID NOT NULL REFERENCES users(id),
  assigned_manager UUID NOT NULL REFERENCES users(id),
  assigned_underwriter UUID REFERENCES users(id),
  num_applicants INTEGER NOT NULL DEFAULT 1 CHECK (num_applicants BETWEEN 1 AND 3),
  vehicle_condition TEXT NOT NULL CHECK (vehicle_condition IN ('new', 'used', 'untitled_demo')),
  vehicle_year TEXT NOT NULL,
  vehicle_make TEXT NOT NULL,
  vehicle_model TEXT NOT NULL,
  vehicle_trim TEXT NOT NULL,
  vehicle_mileage INTEGER,
  msrp NUMERIC(12, 2),
  invoice NUMERIC(12, 2),
  jd_power_retail NUMERIC(12, 2),
  jd_power_wholesale NUMERIC(12, 2),
  net_cap_cost NUMERIC(12, 2),
  total_amount_financed NUMERIC(12, 2),
  monthly_payment NUMERIC(12, 2) NOT NULL,
  has_trade_in BOOLEAN NOT NULL DEFAULT false,
  has_open_autos BOOLEAN NOT NULL DEFAULT false,
  has_business BOOLEAN NOT NULL DEFAULT false,
  business_legal_name TEXT,
  deal_strengths TEXT NOT NULL,
  has_derogatory_credit BOOLEAN NOT NULL DEFAULT false,
  derogatory_credit_explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deal Applicants
CREATE TABLE deal_applicants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  applicant_number INTEGER NOT NULL CHECK (applicant_number BETWEEN 1 AND 3),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  experian_score INTEGER NOT NULL,
  has_alternate_bureau BOOLEAN NOT NULL DEFAULT false,
  alternate_bureau TEXT CHECK (alternate_bureau IN ('equifax', 'transunion')),
  alternate_score INTEGER,
  UNIQUE(deal_id, applicant_number)
);

-- Deal Trade-In
CREATE TABLE deal_trade_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE UNIQUE,
  year TEXT NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  monthly_payment NUMERIC(12, 2) NOT NULL,
  lienholder TEXT NOT NULL,
  who_drives TEXT NOT NULL
);

-- Deal Open Autos
CREATE TABLE deal_open_autos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  auto_number INTEGER NOT NULL CHECK (auto_number BETWEEN 1 AND 10),
  lienholder TEXT NOT NULL,
  monthly_payment NUMERIC(12, 2) NOT NULL,
  who_drives TEXT NOT NULL,
  UNIQUE(deal_id, auto_number)
);

-- Deal Documents
CREATE TABLE deal_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'cybercalc', 'cyberretail', 'credit_application', 'credit_bureau',
    'jd_power_book_outs', 'business_credit_app', 'alternate_credit_bureau',
    'proof_of_income', 'ipacket', 'other'
  )),
  applicant_id UUID REFERENCES deal_applicants(id) ON DELETE SET NULL,
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  replaced_by UUID REFERENCES users(id),
  replaced_at TIMESTAMPTZ
);

-- Deal Messages
CREATE TABLE deal_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  message_type TEXT NOT NULL CHECK (message_type IN ('note', 'action_required')),
  content TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deal Message Views (Read Receipts)
CREATE TABLE deal_message_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES deal_messages(id) ON DELETE CASCADE,
  viewed_by UUID NOT NULL REFERENCES users(id),
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, viewed_by)
);

-- Deal Status History
CREATE TABLE deal_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

-- Deal Field Changes (Audit Trail)
CREATE TABLE deal_field_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID NOT NULL REFERENCES users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deal Assignments
CREATE TABLE deal_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES users(id),
  assigned_by UUID REFERENCES users(id),
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('underwriter_claim', 'reassignment')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Timer Configuration (admin-configurable)
CREATE TABLE timer_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key TEXT NOT NULL UNIQUE,
  green_max_hours NUMERIC(6, 2) NOT NULL,
  yellow_max_hours NUMERIC(6, 2) NOT NULL,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_submitted_by ON deals(submitted_by);
CREATE INDEX idx_deals_assigned_manager ON deals(assigned_manager);
CREATE INDEX idx_deals_assigned_underwriter ON deals(assigned_underwriter);
CREATE INDEX idx_deals_created_at ON deals(created_at);
CREATE INDEX idx_deals_deal_number ON deals(deal_number);

CREATE INDEX idx_deal_messages_deal_id ON deal_messages(deal_id);
CREATE INDEX idx_deal_messages_type_resolved ON deal_messages(message_type, is_resolved);

CREATE INDEX idx_deal_status_history_deal_id ON deal_status_history(deal_id);
CREATE INDEX idx_deal_status_history_changed_at ON deal_status_history(changed_at);

CREATE INDEX idx_deal_documents_deal_id ON deal_documents(deal_id);
CREATE INDEX idx_deal_documents_type ON deal_documents(document_type);

CREATE INDEX idx_deal_applicants_deal_id ON deal_applicants(deal_id);
CREATE INDEX idx_deal_open_autos_deal_id ON deal_open_autos(deal_id);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_team_id ON users(team_id);
CREATE INDEX idx_users_office_id ON users(primary_office_id);

CREATE INDEX idx_deal_field_changes_deal_id ON deal_field_changes(deal_id);
CREATE INDEX idx_deal_assignments_deal_id ON deal_assignments(deal_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-generate deal number
CREATE OR REPLACE FUNCTION generate_deal_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.deal_number := 'DM-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('deal_number_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_deals_generate_number
  BEFORE INSERT ON deals
  FOR EACH ROW
  WHEN (NEW.deal_number IS NULL OR NEW.deal_number = '')
  EXECUTE FUNCTION generate_deal_number();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Auto-create user record when auth.users is created
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'agent'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_trade_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_open_autos ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_message_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_field_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE timer_config ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get current user's team_id
CREATE OR REPLACE FUNCTION get_user_team_id()
RETURNS UUID AS $$
  SELECT team_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get current user's office_id
CREATE OR REPLACE FUNCTION get_user_office_id()
RETURNS UUID AS $$
  SELECT primary_office_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get office_id for a team
CREATE OR REPLACE FUNCTION get_team_office_id(tid UUID)
RETURNS UUID AS $$
  SELECT office_id FROM public.teams WHERE id = tid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- === USERS POLICIES ===

CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Managers can view team members"
  ON users FOR SELECT
  USING (
    get_user_role() = 'manager' AND
    team_id = get_user_team_id()
  );

CREATE POLICY "Underwriters, Executives, Admins can view all users"
  ON users FOR SELECT
  USING (get_user_role() IN ('underwriter', 'executive', 'administrator'));

CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  USING (get_user_role() = 'administrator');

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  WITH CHECK (get_user_role() = 'administrator');

-- Users can update their own profile (limited fields handled at app level)
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- === OFFICES & TEAMS POLICIES ===

CREATE POLICY "Everyone can view offices"
  ON offices FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage offices"
  ON offices FOR ALL
  USING (get_user_role() = 'administrator');

CREATE POLICY "Everyone can view teams"
  ON teams FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage teams"
  ON teams FOR ALL
  USING (get_user_role() = 'administrator');

-- === DEALS POLICIES ===

-- Agents see only their own deals
CREATE POLICY "Agents can view own deals"
  ON deals FOR SELECT
  USING (
    get_user_role() = 'agent' AND
    submitted_by = auth.uid()
  );

-- Managers see deals from their team (agents on their team)
CREATE POLICY "Managers can view team deals"
  ON deals FOR SELECT
  USING (
    get_user_role() = 'manager' AND
    submitted_by IN (
      SELECT id FROM users WHERE team_id = get_user_team_id()
    )
  );

-- Managers can also see deals at their office
CREATE POLICY "Managers can view office deals"
  ON deals FOR SELECT
  USING (
    get_user_role() = 'manager' AND
    submitted_by IN (
      SELECT u.id FROM users u
      JOIN teams t ON u.team_id = t.id
      WHERE t.office_id = get_user_office_id()
    )
  );

-- Underwriters, Executives, Admins see all deals
CREATE POLICY "UW/Exec/Admin can view all deals"
  ON deals FOR SELECT
  USING (get_user_role() IN ('underwriter', 'executive', 'administrator'));

-- Agents can insert deals
CREATE POLICY "Agents can submit deals"
  ON deals FOR INSERT
  WITH CHECK (
    get_user_role() = 'agent' AND
    submitted_by = auth.uid()
  );

-- Agents can update own deals (only when kicked back)
CREATE POLICY "Agents can update own kicked-back deals"
  ON deals FOR UPDATE
  USING (
    get_user_role() = 'agent' AND
    submitted_by = auth.uid()
  );

-- Managers can update deals in their scope
CREATE POLICY "Managers can update team deals"
  ON deals FOR UPDATE
  USING (
    get_user_role() = 'manager' AND
    submitted_by IN (
      SELECT id FROM users WHERE team_id = get_user_team_id()
    )
  );

-- Underwriters can update assigned/unassigned deals
CREATE POLICY "Underwriters can update deals"
  ON deals FOR UPDATE
  USING (
    get_user_role() = 'underwriter' AND
    (assigned_underwriter = auth.uid() OR assigned_underwriter IS NULL OR status IN ('sent_to_underwriting'))
  );

-- Admins can do anything
CREATE POLICY "Admins can manage all deals"
  ON deals FOR ALL
  USING (get_user_role() = 'administrator');

-- === DEAL SUB-TABLE POLICIES ===
-- These follow the deal's visibility — if you can see the deal, you can see its data

CREATE POLICY "View deal applicants" ON deal_applicants FOR SELECT
  USING (deal_id IN (SELECT id FROM deals));
CREATE POLICY "Insert deal applicants" ON deal_applicants FOR INSERT
  WITH CHECK (deal_id IN (SELECT id FROM deals));
CREATE POLICY "Update deal applicants" ON deal_applicants FOR UPDATE
  USING (deal_id IN (SELECT id FROM deals));

CREATE POLICY "View deal trade-ins" ON deal_trade_ins FOR SELECT
  USING (deal_id IN (SELECT id FROM deals));
CREATE POLICY "Insert deal trade-ins" ON deal_trade_ins FOR INSERT
  WITH CHECK (deal_id IN (SELECT id FROM deals));
CREATE POLICY "Update deal trade-ins" ON deal_trade_ins FOR UPDATE
  USING (deal_id IN (SELECT id FROM deals));

CREATE POLICY "View deal open autos" ON deal_open_autos FOR SELECT
  USING (deal_id IN (SELECT id FROM deals));
CREATE POLICY "Insert deal open autos" ON deal_open_autos FOR INSERT
  WITH CHECK (deal_id IN (SELECT id FROM deals));
CREATE POLICY "Update deal open autos" ON deal_open_autos FOR UPDATE
  USING (deal_id IN (SELECT id FROM deals));

CREATE POLICY "View deal documents" ON deal_documents FOR SELECT
  USING (deal_id IN (SELECT id FROM deals));
CREATE POLICY "Insert deal documents" ON deal_documents FOR INSERT
  WITH CHECK (deal_id IN (SELECT id FROM deals));
CREATE POLICY "Update deal documents" ON deal_documents FOR UPDATE
  USING (deal_id IN (SELECT id FROM deals));
CREATE POLICY "Delete deal documents" ON deal_documents FOR DELETE
  USING (deal_id IN (SELECT id FROM deals) AND get_user_role() IN ('manager', 'administrator'));

CREATE POLICY "View deal messages" ON deal_messages FOR SELECT
  USING (deal_id IN (SELECT id FROM deals));
CREATE POLICY "Insert deal messages" ON deal_messages FOR INSERT
  WITH CHECK (deal_id IN (SELECT id FROM deals));
CREATE POLICY "Update deal messages" ON deal_messages FOR UPDATE
  USING (deal_id IN (SELECT id FROM deals));

CREATE POLICY "View message views" ON deal_message_views FOR SELECT
  USING (message_id IN (SELECT id FROM deal_messages));
CREATE POLICY "Insert message views" ON deal_message_views FOR INSERT
  WITH CHECK (message_id IN (SELECT id FROM deal_messages));

CREATE POLICY "View status history" ON deal_status_history FOR SELECT
  USING (deal_id IN (SELECT id FROM deals));
CREATE POLICY "Insert status history" ON deal_status_history FOR INSERT
  WITH CHECK (deal_id IN (SELECT id FROM deals));

CREATE POLICY "View field changes" ON deal_field_changes FOR SELECT
  USING (deal_id IN (SELECT id FROM deals));
CREATE POLICY "Insert field changes" ON deal_field_changes FOR INSERT
  WITH CHECK (deal_id IN (SELECT id FROM deals));

CREATE POLICY "View deal assignments" ON deal_assignments FOR SELECT
  USING (deal_id IN (SELECT id FROM deals));
CREATE POLICY "Insert deal assignments" ON deal_assignments FOR INSERT
  WITH CHECK (deal_id IN (SELECT id FROM deals));

-- Timer config - viewable by all, editable by admins
CREATE POLICY "Everyone can view timer config"
  ON timer_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage timer config"
  ON timer_config FOR ALL
  USING (get_user_role() = 'administrator');

-- ============================================
-- SEED DATA
-- ============================================

-- Insert offices
INSERT INTO offices (name) VALUES
  ('Fort Worth'),
  ('Dallas'),
  ('Houston'),
  ('Austin'),
  ('DLR'),
  ('Four Stars Ford'),
  ('Four Stars Auto Ranch'),
  ('Four Stars Toyota'),
  ('Four Stars Nissan');

-- Insert default timer config
INSERT INTO timer_config (config_key, green_max_hours, yellow_max_hours) VALUES
  ('manager_review', 2, 4),
  ('agent_response', 4, 8),
  ('underwriter_pickup', 1, 2),
  ('underwriter_review', 4, 8);
