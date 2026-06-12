-- ============================================
-- Migration 014: Enforce RLS on reporting views
-- ============================================
-- Bug: the reporting views from migration 008 (v_deal_metrics,
-- v_response_times, v_kickback_analytics) were created without
-- security_invoker. Postgres views default to security_definer semantics —
-- they execute with the view OWNER's privileges and BYPASS row-level
-- security on the underlying tables (deals, deal_status_history, ...).
--
-- These views are exposed through PostgREST at /rest/v1/<view>, so any
-- authenticated user could call the endpoint directly and read EVERY deal's
-- metrics — credit scores, LTV, financing amounts, office performance —
-- regardless of their role. The app's own reporting page is safe (it queries
-- the base `deals` table with the RLS-enforced user client), but the raw API
-- surface is not.
--
-- Fix: switch the views to security_invoker so they run with the querying
-- user's privileges and honor the same RLS policies as the base tables.
-- An agent then sees only their own deals through the view, a manager their
-- team's, and underwriters/executives/admins all — exactly matching the
-- deals SELECT policies. Requires PostgreSQL 15+ (Supabase is 15+).
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query).

ALTER VIEW v_deal_metrics       SET (security_invoker = true);
ALTER VIEW v_response_times     SET (security_invoker = true);
ALTER VIEW v_kickback_analytics SET (security_invoker = true);
