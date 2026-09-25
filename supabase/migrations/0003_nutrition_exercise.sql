-- Nutrition (what did I eat, and when) and Exercise (what did I do, and when).
-- Plain logs: no calories, macros, scores or provider data. Both follow the same security model as
-- medications/appointments — a row belongs to a profile, and a profile belongs to exactly one auth user, so
-- Row Level Security checks profiles.owner_id = auth.uid(). Deleting a profile (or the account) cascades.
-- Nothing here touches an existing table, so this migration is safe to run on a live database.

-- ── shared: keep updated_at honest ──────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── food_entries ────────────────────────────────────────────────────────────
create table food_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'other')),
  -- One instant for date + time, like appointments.scheduled_at; the app queries by local-day range.
  eaten_at timestamptz not null,
  quantity text check (quantity is null or char_length(quantity) <= 60),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index food_entries_profile_eaten_at_idx on food_entries (profile_id, eaten_at desc);

create trigger food_entries_set_updated_at
  before update on food_entries
  for each row execute procedure public.set_updated_at();

alter table food_entries enable row level security;

create policy "food_entries_owner_all" on food_entries
  for all using (
    profile_id in (select id from profiles where owner_id = auth.uid())
  )
  with check (
    profile_id in (select id from profiles where owner_id = auth.uid())
  );

-- ── exercise_entries ────────────────────────────────────────────────────────
create table exercise_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  exercise_type text not null check (exercise_type in (
    'walking', 'running', 'cycling', 'gym', 'strength', 'yoga', 'stretching', 'swimming', 'sports', 'other'
  )),
  -- Custom activity label. Required when the type is 'other'; optional otherwise.
  name text check (name is null or char_length(btrim(name)) between 1 and 120),
  started_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 1 and 1440),
  intensity text check (intensity is null or intensity in ('light', 'moderate', 'vigorous')),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (exercise_type <> 'other' or name is not null)
);

create index exercise_entries_profile_started_at_idx on exercise_entries (profile_id, started_at desc);

create trigger exercise_entries_set_updated_at
  before update on exercise_entries
  for each row execute procedure public.set_updated_at();

alter table exercise_entries enable row level security;

create policy "exercise_entries_owner_all" on exercise_entries
  for all using (
    profile_id in (select id from profiles where owner_id = auth.uid())
  )
  with check (
    profile_id in (select id from profiles where owner_id = auth.uid())
  );

-- Reminders: intentionally not wired up. When meal/exercise reminders are wanted, extend reminders.source_type's
-- check constraint and plan them in src/features/notifications/plan.ts — the entry tables need no change.
