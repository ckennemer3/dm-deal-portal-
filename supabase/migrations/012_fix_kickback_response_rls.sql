-- ============================================
-- Migration 012: Fix kickback response RLS
-- ============================================
-- Bug: kickback_reasons has SELECT and INSERT policies (migration 008) but no
-- UPDATE policy. respondToKickback() updates the row to store the response
-- (response_text, responded_by, is_resolved) — RLS silently filters the update
-- to 0 rows, so responses were never saved and the kicker never saw the
-- "Kickback Response Received" banner.
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query).

CREATE POLICY "Update kickback_reasons for visible deals"
  ON kickback_reasons FOR UPDATE
  USING (deal_id IN (SELECT id FROM deals));
