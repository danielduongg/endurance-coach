-- Strava live-sync schema for the iron-coach app.
-- Two tables: a token vault (service-role only) and activities (the app's data shape).

-- ---------------------------------------------------------------- accounts
create table if not exists public.strava_accounts (
  athlete_id   bigint primary key,
  access_token text not null,
  refresh_token text not null,
  expires_at   bigint not null,            -- unix seconds, per Strava's token payload
  firstname    text,
  lastname     text,
  scope        text,
  backfilled   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- -------------------------------------------------------------- activities
-- id is text so multiple sources coexist: 'strava:123456789', 'manual:<uuid>'.
create table if not exists public.activities (
  id          text primary key,
  athlete_id  bigint not null references public.strava_accounts (athlete_id) on delete cascade,
  day         date not null,
  sport       text not null check (sport in ('swim', 'bike', 'run', 'strength')),
  hours       numeric(6,3) not null check (hours > 0 and hours < 24),
  distance_m  numeric,
  avg_hr      numeric,
  name        text,
  raw_type    text,
  source      text not null default 'strava',
  start_date  timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists activities_athlete_day_idx
  on public.activities (athlete_id, day desc);

-- ------------------------------------------------------------------- RLS
alter table public.strava_accounts enable row level security;
alter table public.activities enable row level security;

-- strava_accounts: NO policies on purpose. Tokens are reachable only through
-- the service-role key used by the edge functions. The anon key sees nothing.

-- activities: readable with the anon key so the frontend can query + subscribe.
-- (Single-athlete scaffold. For multi-user, add a user_id column tied to
--  auth.uid() and scope this policy to it.)
create policy "activities are readable"
  on public.activities for select
  using (true);

-- Allow the app's manual session logger to insert rows — but only manual ones.
create policy "manual sessions can be logged"
  on public.activities for insert
  with check (source = 'manual' and id like 'manual:%');

-- ---------------------------------------------------------------- realtime
-- Stream inserts/updates/deletes to the frontend hook.
alter publication supabase_realtime add table public.activities;
