-- Migration 007: Add kickback reason tracking to deal_status_history
-- Purpose: Track structured reasons for kickbacks for reporting
-- (who kicks back the most, why, by manager/agent/underwriter)

ALTER TABLE deal_status_history
  ADD COLUMN kickback_reason TEXT,
  ADD COLUMN kickback_explanation TEXT;

-- Index for reporting queries on kickback reasons
CREATE INDEX idx_deal_status_history_kickback_reason
  ON deal_status_history(kickback_reason)
  WHERE kickback_reason IS NOT NULL;
