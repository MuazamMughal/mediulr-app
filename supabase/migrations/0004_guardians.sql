-- Guardians: people a patient trusts to be told when they miss a dose.
-- A guardian is just contact details the patient typed in (name + phone). Mediulr never contacts them itself —
-- when a dose is missed the app opens the patient's own messaging app with a prefilled note, and the patient
-- chooses whether to send it (see docs/COMPLIANCE.md: the patient controls every transmission).
-- linked_user_id is reserved for a future "guardian has their own Mediulr account" mode and is unused today.
-- Same ownership model as the other tables: a guardian belongs to a profile, a profile to one auth user.
-- Only adds a table; safe to run on a live database.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table guardians (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  relationship text check (relationship is null or char_length(relationship) <= 40),
  -- Digits with an optional leading +, already stripped of spaces/dashes by the app.
  phone text not null check (phone ~ '^\+?[0-9]{7,15}$'),
  notify_on_missed boolean not null default true,
  linked_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index guardians_profile_idx on guardians (profile_id);

create trigger guardians_set_updated_at
  before update on guardians
  for each row execute procedure public.set_updated_at();

-- At most three guardians per profile: enough for a family, and keeps the "tell them" message a sane group text.
create function public.enforce_guardian_limit()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.guardians where profile_id = new.profile_id) >= 3 then
    raise exception 'A profile can have at most 3 guardians';
  end if;
  return new;
end;
$$;

create trigger guardians_limit
  before insert on guardians
  for each row execute procedure public.enforce_guardian_limit();

alter table guardians enable row level security;

create policy "guardians_owner_all" on guardians
  for all using (
    profile_id in (select id from profiles where owner_id = auth.uid())
  )
  with check (
    profile_id in (select id from profiles where owner_id = auth.uid())
  );
