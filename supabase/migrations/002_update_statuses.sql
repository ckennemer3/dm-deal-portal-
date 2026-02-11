-- ============================================
-- Migration: Replace deal status system
-- Old: 11 statuses (internal review pipeline)
-- New: 8 statuses (D&M real workflow)
-- ============================================

-- Step 1: Map existing deal rows from old → new statuses
-- Must happen BEFORE we alter the constraint

UPDATE deals SET status = CASE status
  -- Direct mappings
  WHEN 'submitted_to_manager'         THEN 'pending_manager_review'
  WHEN 'manager_reviewing'            THEN 'pending_manager_review'
  WHEN 'sent_to_underwriting'         THEN 'submitted_to_underwriting'
  WHEN 'underwriting_assigned'        THEN 'submitted_to_underwriting'
  WHEN 'underwriting_reviewing'       THEN 'submitted_to_underwriting'
  WHEN 'kicked_back_to_manager'       THEN 'kicked_back_to_sales'
  WHEN 'kicked_back_to_agent'         THEN 'kicked_back_to_sales'
  WHEN 'resubmitted_to_manager'       THEN 'pending_manager_review'
  WHEN 'resubmitted_to_underwriting'  THEN 'submitted_to_underwriting'
  WHEN 'completed'                    THEN 'signed_and_delivered'
  WHEN 'cancelled'                    THEN 'cancelled'
  ELSE status
END;

-- Step 2: Drop the old CHECK constraint and add the new one
-- Postgres names inline CHECK constraints as "<table>_<column>_check"
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_status_check;

ALTER TABLE deals ADD CONSTRAINT deals_status_check CHECK (status IN (
  'pending',
  'pending_manager_review',
  'submitted_to_underwriting',
  'kicked_back_to_sales',
  'submitted_to_lender',
  'approved',
  'signed_and_delivered',
  'cancelled'
));

-- Step 3: Change the default value for new deals
ALTER TABLE deals ALTER COLUMN status SET DEFAULT 'pending';

-- Step 4: Also update status_history rows so reporting queries work
UPDATE deal_status_history SET from_status = CASE from_status
  WHEN 'submitted_to_manager'         THEN 'pending_manager_review'
  WHEN 'manager_reviewing'            THEN 'pending_manager_review'
  WHEN 'sent_to_underwriting'         THEN 'submitted_to_underwriting'
  WHEN 'underwriting_assigned'        THEN 'submitted_to_underwriting'
  WHEN 'underwriting_reviewing'       THEN 'submitted_to_underwriting'
  WHEN 'kicked_back_to_manager'       THEN 'kicked_back_to_sales'
  WHEN 'kicked_back_to_agent'         THEN 'kicked_back_to_sales'
  WHEN 'resubmitted_to_manager'       THEN 'pending_manager_review'
  WHEN 'resubmitted_to_underwriting'  THEN 'submitted_to_underwriting'
  WHEN 'completed'                    THEN 'signed_and_delivered'
  WHEN 'cancelled'                    THEN 'cancelled'
  ELSE from_status
END
WHERE from_status IN (
  'submitted_to_manager', 'manager_reviewing', 'sent_to_underwriting',
  'underwriting_assigned', 'underwriting_reviewing',
  'kicked_back_to_manager', 'kicked_back_to_agent',
  'resubmitted_to_manager', 'resubmitted_to_underwriting',
  'completed'
);

UPDATE deal_status_history SET to_status = CASE to_status
  WHEN 'submitted_to_manager'         THEN 'pending_manager_review'
  WHEN 'manager_reviewing'            THEN 'pending_manager_review'
  WHEN 'sent_to_underwriting'         THEN 'submitted_to_underwriting'
  WHEN 'underwriting_assigned'        THEN 'submitted_to_underwriting'
  WHEN 'underwriting_reviewing'       THEN 'submitted_to_underwriting'
  WHEN 'kicked_back_to_manager'       THEN 'kicked_back_to_sales'
  WHEN 'kicked_back_to_agent'         THEN 'kicked_back_to_sales'
  WHEN 'resubmitted_to_manager'       THEN 'pending_manager_review'
  WHEN 'resubmitted_to_underwriting'  THEN 'submitted_to_underwriting'
  WHEN 'completed'                    THEN 'signed_and_delivered'
  WHEN 'cancelled'                    THEN 'cancelled'
  ELSE to_status
END
WHERE to_status IN (
  'submitted_to_manager', 'manager_reviewing', 'sent_to_underwriting',
  'underwriting_assigned', 'underwriting_reviewing',
  'kicked_back_to_manager', 'kicked_back_to_agent',
  'resubmitted_to_manager', 'resubmitted_to_underwriting',
  'completed'
);

-- Step 5: Update the RLS policy for underwriters that references old status
-- Drop the old policy and recreate with new status value
DROP POLICY IF EXISTS "Underwriters can update deals" ON deals;

CREATE POLICY "Underwriters can update deals"
  ON deals FOR UPDATE
  USING (
    get_user_role() = 'underwriter' AND
    (assigned_underwriter = auth.uid() OR assigned_underwriter IS NULL OR status IN ('submitted_to_underwriting'))
  );
