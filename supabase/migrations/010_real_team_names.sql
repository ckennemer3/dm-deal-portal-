-- Migration 010: Replace placeholder teams with real team names
--
-- Fort Worth teams: EA, SA, JA, RA
-- Dallas teams: ED, RD, SD, SR
-- Houston teams: JH, RH, EH
-- Apple Leasing teams: RL, CL
--
-- Run this in the Supabase SQL Editor.

BEGIN;

-- First, remove the placeholder "Team 1" entries (move any users off them first)
-- We'll update users who are on old placeholder teams to NULL, then reassign after.

-- Store old team assignments so we don't lose users
-- (Users on "Team 1" will need to be manually reassigned to the correct new team)

-- Delete placeholder teams that have no users assigned
DELETE FROM teams
WHERE name = 'Team 1'
  AND id NOT IN (SELECT DISTINCT team_id FROM users WHERE team_id IS NOT NULL);

-- For placeholder teams that DO have users, rename them to indicate they need reassignment
UPDATE teams
SET name = 'REASSIGN - ' || (SELECT o.name FROM offices o WHERE o.id = teams.office_id)
WHERE name = 'Team 1';

-- Insert real teams for Fort Worth
INSERT INTO teams (name, office_id)
SELECT 'EA', id FROM offices WHERE name = 'D&M Leasing Fort Worth'
ON CONFLICT (name, office_id) DO NOTHING;

INSERT INTO teams (name, office_id)
SELECT 'SA', id FROM offices WHERE name = 'D&M Leasing Fort Worth'
ON CONFLICT (name, office_id) DO NOTHING;

INSERT INTO teams (name, office_id)
SELECT 'JA', id FROM offices WHERE name = 'D&M Leasing Fort Worth'
ON CONFLICT (name, office_id) DO NOTHING;

INSERT INTO teams (name, office_id)
SELECT 'RA', id FROM offices WHERE name = 'D&M Leasing Fort Worth'
ON CONFLICT (name, office_id) DO NOTHING;

-- Insert real teams for Dallas
INSERT INTO teams (name, office_id)
SELECT 'ED', id FROM offices WHERE name = 'D&M Leasing Dallas'
ON CONFLICT (name, office_id) DO NOTHING;

INSERT INTO teams (name, office_id)
SELECT 'RD', id FROM offices WHERE name = 'D&M Leasing Dallas'
ON CONFLICT (name, office_id) DO NOTHING;

INSERT INTO teams (name, office_id)
SELECT 'SD', id FROM offices WHERE name = 'D&M Leasing Dallas'
ON CONFLICT (name, office_id) DO NOTHING;

INSERT INTO teams (name, office_id)
SELECT 'SR', id FROM offices WHERE name = 'D&M Leasing Dallas'
ON CONFLICT (name, office_id) DO NOTHING;

-- Insert real teams for Houston
INSERT INTO teams (name, office_id)
SELECT 'JH', id FROM offices WHERE name = 'D&M Leasing Houston'
ON CONFLICT (name, office_id) DO NOTHING;

INSERT INTO teams (name, office_id)
SELECT 'RH', id FROM offices WHERE name = 'D&M Leasing Houston'
ON CONFLICT (name, office_id) DO NOTHING;

INSERT INTO teams (name, office_id)
SELECT 'EH', id FROM offices WHERE name = 'D&M Leasing Houston'
ON CONFLICT (name, office_id) DO NOTHING;

-- Insert real teams for Apple Leasing
INSERT INTO teams (name, office_id)
SELECT 'RL', id FROM offices WHERE name = 'Apple Leasing'
ON CONFLICT (name, office_id) DO NOTHING;

INSERT INTO teams (name, office_id)
SELECT 'CL', id FROM offices WHERE name = 'Apple Leasing'
ON CONFLICT (name, office_id) DO NOTHING;

COMMIT;
