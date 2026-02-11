-- ============================================
-- Migration: Add term (months) column to deals
-- ============================================

ALTER TABLE deals ADD COLUMN term INTEGER;
