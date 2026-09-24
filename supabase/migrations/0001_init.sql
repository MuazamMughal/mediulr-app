-- Mediulr initial schema.
-- Every table is scoped to the authenticated user via Row Level Security,
-- either directly (auth.uid()) or through profiles.owner_id for dependents.
-- See docs/DATA_MODEL.md for the conceptual model.

create extension if not exists "pgcrypto";

-- ── profiles ────────────────────────────────────────────────────────────────
create table profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  is_self boolean not null default false,
  display_name text not null,
  date_of_birth date,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles_owner_all" on profiles
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ── medications ─────────────────────────────────────────────────────────────
create table medications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  name text not null,
  dosage text not null,
  instructions text,
  recurrence_rule jsonb not null,
  quantity_on_hand integer,
  refill_threshold integer,
  start_date date not null,
  end_date date,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

alter table medications enable row level security;

create policy "medications_owner_all" on medications
  for all using (
    profile_id in (select id from profiles where owner_id = auth.uid())
  )
  with check (
    profile_id in (select id from profiles where owner_id = auth.uid())
  );

-- ── dose_logs ───────────────────────────────────────────────────────────────
create table dose_logs (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references medications (id) on delete cascade,
  scheduled_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'taken', 'skipped', 'snoozed')),
  logged_at timestamptz,
  unique (medication_id, scheduled_at)
);

alter table dose_logs enable row level security;

create policy "dose_logs_owner_all" on dose_logs
  for all using (
    medication_id in (
      select m.id from medications m
      join profiles p on p.id = m.profile_id
      where p.owner_id = auth.uid()
    )
  )
  with check (
    medication_id in (
      select m.id from medications m
      join profiles p on p.id = m.profile_id
      where p.owner_id = auth.uid()
    )
  );

-- ── appointments ────────────────────────────────────────────────────────────
-- Patient-entered only. Never populated by, or synced to, a provider system — see docs/COMPLIANCE.md.
create table appointments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  provider_name text not null,
  specialty text,
  location text,
  scheduled_at timestamptz not null,
  pre_visit_notes text,
  post_visit_notes text,
  created_at timestamptz not null default now()
);

alter table appointments enable row level security;

create policy "appointments_owner_all" on appointments
  for all using (
    profile_id in (select id from profiles where owner_id = auth.uid())
  )
  with check (
    profile_id in (select id from profiles where owner_id = auth.uid())
  );

-- ── reminders ───────────────────────────────────────────────────────────────
create table reminders (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('medication', 'appointment')),
  source_id uuid not null,
  offset_minutes integer not null,
  escalation_enabled boolean not null default false
);

alter table reminders enable row level security;

-- Reminders don't carry profile_id directly; enforce ownership via the source row.
create policy "reminders_owner_select" on reminders
  for select using (
    (source_type = 'medication' and source_id in (
      select m.id from medications m join profiles p on p.id = m.profile_id where p.owner_id = auth.uid()
    ))
    or
    (source_type = 'appointment' and source_id in (
      select a.id from appointments a join profiles p on p.id = a.profile_id where p.owner_id = auth.uid()
    ))
  );

create policy "reminders_owner_write" on reminders
  for insert with check (
    (source_type = 'medication' and source_id in (
      select m.id from medications m join profiles p on p.id = m.profile_id where p.owner_id = auth.uid()
    ))
    or
    (source_type = 'appointment' and source_id in (
      select a.id from appointments a join profiles p on p.id = a.profile_id where p.owner_id = auth.uid()
    ))
  );

create policy "reminders_owner_delete" on reminders
  for delete using (
    (source_type = 'medication' and source_id in (
      select m.id from medications m join profiles p on p.id = m.profile_id where p.owner_id = auth.uid()
    ))
    or
    (source_type = 'appointment' and source_id in (
      select a.id from appointments a join profiles p on p.id = a.profile_id where p.owner_id = auth.uid()
    ))
  );

-- ── subscriptions ───────────────────────────────────────────────────────────
-- Mirrors RevenueCat entitlement state; written by a server-side webhook handler (service role), read by the user.
create table subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null check (status in ('trial', 'active', 'expired', 'canceled')),
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table subscriptions enable row level security;

create policy "subscriptions_owner_select" on subscriptions
  for select using (user_id = auth.uid());

-- No insert/update policy for regular users: only the service role (RevenueCat webhook) writes this table.

-- ── auto-create a "self" profile on signup ─────────────────────────────────
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (owner_id, is_self, display_name)
  values (new.id, true, coalesce(new.raw_user_meta_data ->> 'display_name', 'Me'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
