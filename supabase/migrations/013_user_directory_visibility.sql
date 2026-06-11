-- ============================================
-- Migration 013: User directory visibility
-- ============================================
-- Bug: agents can only SELECT their own users row and managers only their
-- team's. As a result, on a deal detail page the batch user lookup cannot
-- resolve other participants:
--   * agents see "Manager: —" in the People card
--   * manager/underwriter actions render as "System" / "Unknown" in the
--     Deal History, Latest Note, and Communication thread
--   * managers cannot resolve the underwriter's name after a claim/kickback
--
-- Fix: every authenticated portal user may read the user directory (names,
-- emails, roles). Mutations remain admin-only. This mirrors the future
-- Microsoft Entra ID (Azure AD) model where the org directory is readable
-- by signed-in staff.
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query).

CREATE POLICY "Authenticated users can view the user directory"
  ON users FOR SELECT
  USING (auth.uid() IS NOT NULL);
