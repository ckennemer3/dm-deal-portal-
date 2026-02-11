-- ============================================
-- Migration: Fix corrupted primary_office_id values
-- Some users have slug strings (e.g., 'dm-fort-worth') instead of UUIDs.
-- ============================================

-- Approach: Scan for non-UUID primary_office_id values and try to match
-- them to real offices by name pattern. If no match, set to NULL.

DO $$
DECLARE
  r RECORD;
  matched_office_id UUID;
BEGIN
  FOR r IN
    SELECT id, primary_office_id::text AS office_val
    FROM users
    WHERE primary_office_id IS NOT NULL
  LOOP
    BEGIN
      -- Try to cast to UUID; if it succeeds, it's valid — skip
      PERFORM r.office_val::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      -- Not a valid UUID — try to match by name pattern
      -- Normalize: 'dm-fort-worth' → match office containing 'fort worth'
      SELECT o.id INTO matched_office_id
      FROM offices o
      WHERE LOWER(REPLACE(REPLACE(o.name, ' ', '-'), '&', 'and')) = LOWER(r.office_val)
         OR LOWER(o.name) LIKE '%' || REPLACE(REPLACE(LOWER(r.office_val), 'dm-', ''), '-', ' ') || '%'
      LIMIT 1;

      IF matched_office_id IS NOT NULL THEN
        UPDATE users SET primary_office_id = matched_office_id WHERE id = r.id;
        RAISE NOTICE 'Fixed user % : % → %', r.id, r.office_val, matched_office_id;
      ELSE
        -- No match found — null it out so FK constraint isn't violated
        UPDATE users SET primary_office_id = NULL WHERE id = r.id;
        RAISE NOTICE 'Nulled user % : no match for %', r.id, r.office_val;
      END IF;
    END;
  END LOOP;
END $$;
