-- Custom reminders: anything a person wants to be reminded about that isn't a medication or a doctor visit
-- (a blood test, a vaccine, "check blood pressure", "collect the lab report"). One-off or repeating; each occurrence
-- can be ticked off. Same ownership model as everything else: a reminder belongs to a profile, a profile to one auth
-- user, so Row Level Security checks profiles.owner_id = auth.uid(). Deleting a profile or the account cascades.
-- Only adds tables; safe on a live database. (The older, unused `reminders` table is untouched.)

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table custom_reminders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  notes text check (notes is null or char_length(notes) <= 500),
  -- Same rule shapes as medications (see docs/DATA_MODEL.md), plus "monthly" and "every_n_days".
  recurrence_rule jsonb not null,
  start_date date not null,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create index custom_reminders_profile_idx on custom_reminders (profile_id);

create trigger custom_reminders_set_updated_at
  before update on custom_reminders
  for each row execute procedure public.set_updated_at();

alter table custom_reminders enable row level security;

create policy "custom_reminders_owner_all" on custom_reminders
  for all using (
    profile_id in (select id from profiles where owner_id = auth.uid())
  )
  with check (
    profile_id in (select id from profiles where owner_id = auth.uid())
  );

-- One row per ticked-off occurrence. Un-ticking deletes the row.
create table reminder_completions (
  reminder_id uuid not null references custom_reminders (id) on delete cascade,
  scheduled_at timestamptz not null,
  completed_at timestamptz not null default now(),
  primary key (reminder_id, scheduled_at)
);

alter table reminder_completions enable row level security;

create policy "reminder_completions_owner_all" on reminder_completions
  for all using (
    reminder_id in (
      select r.id from custom_reminders r
      join profiles p on p.id = r.profile_id
      where p.owner_id = auth.uid()
    )
  )
  with check (
    reminder_id in (
      select r.id from custom_reminders r
      join profiles p on p.id = r.profile_id
      where p.owner_id = auth.uid()
    )
  );
