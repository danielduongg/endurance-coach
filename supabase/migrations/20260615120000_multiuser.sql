-- Multi-user hardening.
--
-- The original schema was a single-athlete scaffold: activities had a SELECT
-- policy of `using (true)`, so ANY holder of the public anon key could read EVERY
-- athlete's data. This migration binds each Strava athlete to a Supabase auth user
-- and scopes all activity access to that user, closing the public-read hole.
--
-- Identity model: "Strava is the login." The browser signs in anonymously (a real,
-- refreshable Supabase session), and `strava-callback` mints a one-time link code
-- that `strava-link` exchanges to set strava_accounts.owner_uid = auth.uid().
-- Tokens never leave the server: strava_accounts stays service-role-only, and the
-- activities policies reach it only through a SECURITY DEFINER helper that returns
-- athlete ids (never token columns).

-- 1. Ownership + one-time link code on the account row. ----------------------
alter table public.strava_accounts
  add column if not exists owner_uid            uuid references auth.users (id) on delete set null,
  add column if not exists link_code            text,
  add column if not exists link_code_expires_at timestamptz;

create index if not exists strava_accounts_owner_idx on public.strava_accounts (owner_uid);
-- Look up the pending link code quickly (and only while one is set).
create index if not exists strava_accounts_link_code_idx
  on public.strava_accounts (link_code) where link_code is not null;

-- 2. Helper: athlete ids owned by the current user. --------------------------
-- SECURITY DEFINER so the activities policies can consult strava_accounts WITHOUT
-- granting `authenticated` any direct access to that table (which holds tokens).
-- Returns only athlete ids — never access_token / refresh_token.
create or replace function public.my_athlete_ids()
  returns setof bigint
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select athlete_id
  from public.strava_accounts
  where owner_uid = (select auth.uid());
$$;

revoke all on function public.my_athlete_ids() from public, anon;
grant execute on function public.my_athlete_ids() to authenticated;

-- 3. Replace the permissive activities policies with owner-scoped ones. -------
drop policy if exists "activities are readable"        on public.activities;
drop policy if exists "manual sessions can be logged"  on public.activities;

create policy "own activities readable"
  on public.activities for select to authenticated
  using ( athlete_id in (select public.my_athlete_ids()) );

create policy "own manual sessions insertable"
  on public.activities for insert to authenticated
  with check (
    source = 'manual'
    and id like 'manual:%'
    and athlete_id in (select public.my_athlete_ids())
  );

create policy "own manual sessions updatable"
  on public.activities for update to authenticated
  using ( source = 'manual' and athlete_id in (select public.my_athlete_ids()) )
  with check ( source = 'manual' and athlete_id in (select public.my_athlete_ids()) );

create policy "own manual sessions deletable"
  on public.activities for delete to authenticated
  using ( source = 'manual' and athlete_id in (select public.my_athlete_ids()) );

-- 4. Lock down table grants. -------------------------------------------------
-- The browser now authenticates (anonymous sign-in => role `authenticated`), so
-- `anon` no longer needs — or gets — any access to activities. This is what
-- actually closes the public-read hole; the RLS policies above scope the rest.
revoke select, insert, update, delete on public.activities from anon;
grant  select, insert, update, delete on public.activities to authenticated;

-- strava_accounts is unchanged here: service-role-only (the token vault). It has
-- no policies and no anon/authenticated grants, so the client can never read it.
