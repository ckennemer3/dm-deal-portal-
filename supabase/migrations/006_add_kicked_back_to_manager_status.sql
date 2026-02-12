-- ============================================
-- Migration: Add kicked_back_to_manager status
-- UW kicks back → manager (not directly to agent)
-- Manager can then kick further to agent or resubmit to UW
-- ============================================

-- Step 1: Drop old CHECK constraint
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_status_check;

-- Step 2: Add updated CHECK with new status
ALTER TABLE deals ADD CONSTRAINT deals_status_check CHECK (status IN (
  'pending',
  'pending_manager_review',
  'submitted_to_underwriting',
  'kicked_back_to_manager',
  'kicked_back_to_sales',
  'submitted_to_lender',
  'approved',
  'signed_and_delivered',
  'cancelled'
));
