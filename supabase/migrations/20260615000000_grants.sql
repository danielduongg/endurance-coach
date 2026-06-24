-- Table privileges for the Strava live-sync schema.
--
-- The init migration (20260612000000_init.sql) creates the tables + RLS but relies on
-- Supabase's default privileges to expose them to the service_role / anon / authenticated
-- roles. Those defaults did NOT apply on this project, so:
--   * edge functions (service-role key) failed with
--       "permission denied for table strava_accounts"  (Postgres error 42501)
--     on the OAuth callback, the backfill, and webhook writes;
--   * the frontend (anon key) could not read `activities` (history load + realtime).
--
-- These GRANTs restore the intended access. They are idempotent.

-- Backend: the edge functions connect with the service-role key and need full access
-- to both tables (token upsert/refresh, backfill upsert, webhook insert/update/delete).
grant select, insert, update, delete on public.strava_accounts to service_role;
grant select, insert, update, delete on public.activities      to service_role;

-- Frontend: the browser uses the anon key (role `anon`; `authenticated` if a user is
-- signed in). It reads `activities` for the initial history load + the realtime
-- subscription, and inserts manual sessions. Row access is still governed by RLS
-- (activities: SELECT using (true); INSERT only for source='manual' / id like 'manual:%').
grant select, insert on public.activities to anon, authenticated;

-- NOTE: public.strava_accounts is deliberately NOT granted to anon/authenticated.
-- It is the token vault — reachable only through the service-role key. RLS on it has
-- no policies, so the anon key sees nothing even if a grant were ever added.
