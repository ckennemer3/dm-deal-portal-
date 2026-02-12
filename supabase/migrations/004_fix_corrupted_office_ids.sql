-- ============================================
-- Migration: Fix corrupted primary_office_id values
-- Some users have slug strings (e.g., 'dm-fort-worth') instead of UUIDs.
-- ============================================
--
-- HOW TO RUN: Copy this SQL into Supabase Dashboard → SQL Editor → Run
-- Supabase does NOT auto-run migration files from Git deployments.
--
-- After running, re-assign offices to users via the Admin panel.
-- ============================================

-- Nuclear option: clear all primary_office_id values to fix the crash.
-- The column is nullable so this is safe. Re-assign via Admin → Users.
UPDATE users SET primary_office_id = NULL;
