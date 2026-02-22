-- ============================================
-- Migration 011: Add General Manager Role
-- ============================================
-- General Manager is a cross-office manager with visibility and actions
-- across ALL sales offices. Cannot see underwriting-internal metrics.

-- 1. Update CHECK constraint to include general_manager
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('agent', 'manager', 'general_manager', 'underwriter', 'executive', 'administrator'));

-- 2. RLS: General Managers can view ALL users (like executive)
CREATE POLICY "General Managers can view all users"
  ON users FOR SELECT
  USING (get_user_role() = 'general_manager');

-- 3. RLS: General Managers can view ALL deals (cross-office visibility)
CREATE POLICY "General Managers can view all deals"
  ON deals FOR SELECT
  USING (get_user_role() = 'general_manager');

-- 4. RLS: General Managers can update any deal (full manager powers cross-office)
CREATE POLICY "General Managers can update deals"
  ON deals FOR UPDATE
  USING (get_user_role() = 'general_manager');

-- Sub-tables (deal_applicants, deal_status_history, deal_messages, etc.)
-- already use `deal_id IN (SELECT id FROM deals)` for visibility.
-- The new deals SELECT policy above automatically grants sub-table access.

-- 5. RLS: General Managers can delete documents (same as manager)
-- Current policy: "Delete deal documents" allows manager and administrator.
-- We need to add general_manager. Drop and recreate.
DROP POLICY IF EXISTS "Delete deal documents" ON deal_documents;
CREATE POLICY "Delete deal documents" ON deal_documents FOR DELETE
  USING (deal_id IN (SELECT id FROM deals) AND get_user_role() IN ('manager', 'general_manager', 'administrator'));
