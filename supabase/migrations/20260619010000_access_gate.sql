-- Defense-in-depth paywall: gate activity reads on access (trial / subscription /
-- comped), on top of ownership. So even a tampered client gets no data once the
-- trial ends — the lock isn't just in the UI. Service-role writes (Strava backfill,
-- webhook) bypass RLS and are unaffected.

drop policy if exists "own activities readable" on public.activities;
create policy "own activities readable"
  on public.activities for select to authenticated
  using ( public.has_app_access() and athlete_id in (select public.my_athlete_ids()) );
