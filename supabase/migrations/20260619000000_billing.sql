-- Billing: 30-day free trial, then a subscription paywall.
--
-- Every Supabase auth user gets one billing row at signup, which starts their
-- 30-day trial. Access = still inside the trial OR a live Stripe subscription.
-- Only the signup trigger and the service-role (Stripe webhook) ever write here;
-- the user can read their own row to see trial/subscription state.

create table if not exists public.billing (
  user_id             uuid primary key references auth.users (id) on delete cascade,
  trial_started_at    timestamptz not null default now(),
  stripe_customer_id  text,
  subscription_status text,            -- null | trialing | active | past_due | canceled | incomplete
  current_period_end  timestamptz,
  comped              boolean not null default false,   -- owner / comped accounts: permanent access
  updated_at          timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

alter table public.billing enable row level security;

-- A user may read only their own billing row. No client writes — the signup
-- trigger and the Stripe webhook (service role) are the only writers.
grant select on public.billing to authenticated;
create policy "own billing readable" on public.billing for select to authenticated
  using (user_id = (select auth.uid()));
grant select, insert, update, delete on public.billing to service_role;

create index if not exists billing_customer_idx on public.billing (stripe_customer_id);

-- Start the trial automatically when a new auth user is created.
create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  insert into public.billing (user_id) values (new.id)
    on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: anyone who already exists gets a trial starting now.
insert into public.billing (user_id)
  select id from auth.users on conflict (user_id) do nothing;

-- Access gate: inside the 30-day trial, or a live subscription.
-- SECURITY DEFINER so it can read billing without exposing the table broadly;
-- used by the frontend and (next migration) by data-layer RLS.
create or replace function public.has_app_access()
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select exists (
    select 1 from public.billing b
    where b.user_id = (select auth.uid())
      and ( b.comped
            or now() < b.trial_started_at + interval '30 days'
            or b.subscription_status in ('active', 'trialing') )
  );
$$;

revoke all on function public.has_app_access() from public, anon;
grant execute on function public.has_app_access() to authenticated;
