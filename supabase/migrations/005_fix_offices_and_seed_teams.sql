-- ============================================
-- Migration 005: Fix offices, seed teams, clear corrupted data
-- ============================================
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Also run migrations 003 and 004 if you haven't already.

-- 1. Clear ALL corrupted primary_office_id values
--    (some users have slug strings like "dm-fort-worth" instead of UUIDs)
UPDATE users SET primary_office_id = NULL;

-- 2. Rename offices to match D&M's real office names
UPDATE offices SET name = 'D&M Leasing Fort Worth' WHERE name = 'Fort Worth';
UPDATE offices SET name = 'D&M Leasing Dallas'     WHERE name = 'Dallas';
UPDATE offices SET name = 'D&M Leasing Houston'     WHERE name = 'Houston';
UPDATE offices SET name = 'Apple Leasing'            WHERE name = 'Austin';
UPDATE offices SET name = 'Dallas Lease Returns'     WHERE name = 'DLR';
-- Four Stars offices keep their existing names (no change needed)

-- 3. Seed a default team for each office
--    Admins can rename these or add more via Admin → Teams tab
INSERT INTO teams (name, office_id)
SELECT 'Team 1', id FROM offices WHERE name = 'D&M Leasing Fort Worth'
ON CONFLICT (name, office_id) DO NOTHING;

INSERT INTO teams (name, office_id)
SELECT 'Team 1', id FROM offices WHERE name = 'D&M Leasing Dallas'
ON CONFLICT (name, office_id) DO NOTHING;

INSERT INTO teams (name, office_id)
SELECT 'Team 1', id FROM offices WHERE name = 'D&M Leasing Houston'
ON CONFLICT (name, office_id) DO NOTHING;

INSERT INTO teams (name, office_id)
SELECT 'Team 1', id FROM offices WHERE name = 'Apple Leasing'
ON CONFLICT (name, office_id) DO NOTHING;

INSERT INTO teams (name, office_id)
SELECT 'Team 1', id FROM offices WHERE name = 'Dallas Lease Returns'
ON CONFLICT (name, office_id) DO NOTHING;

INSERT INTO teams (name, office_id)
SELECT 'Team 1', id FROM offices WHERE name = 'Four Stars Ford'
ON CONFLICT (name, office_id) DO NOTHING;

INSERT INTO teams (name, office_id)
SELECT 'Team 1', id FROM offices WHERE name = 'Four Stars Auto Ranch'
ON CONFLICT (name, office_id) DO NOTHING;

INSERT INTO teams (name, office_id)
SELECT 'Team 1', id FROM offices WHERE name = 'Four Stars Toyota'
ON CONFLICT (name, office_id) DO NOTHING;

INSERT INTO teams (name, office_id)
SELECT 'Team 1', id FROM offices WHERE name = 'Four Stars Nissan'
ON CONFLICT (name, office_id) DO NOTHING;
