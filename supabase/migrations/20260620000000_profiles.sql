-- Per-user profile: saves the athlete's training setup so personal data follows
-- the account across devices, instead of living only in one browser's storage.
--   settings = the committed plan inputs (race, age, weight, weekly hours, …)
--   draft    = the in-progress setup form (so an unfinished setup resumes too)
-- Each user can read and write ONLY their own row (RLS). Strava tokens are NOT
-- here — those stay in the service-role-only strava_accounts table.

create table if not exists public.profiles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  settings    jsonb,
  draft       jsonb,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- The owner reads and upserts their own row; nobody can see anyone else's.
grant select, insert, update on public.profiles to authenticated;

create policy "own profile readable" on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));

create policy "own profile insertable" on public.profiles for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "own profile updatable" on public.profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Service role (admin tasks) keeps full access; RLS does not apply to it.
grant select, insert, update, delete on public.profiles to service_role;
