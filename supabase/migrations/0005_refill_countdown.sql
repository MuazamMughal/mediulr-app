-- Refill tracking: count a medication's supply down as doses are taken.
-- Done in the database (not the app) so it is exact even when a dose answer is saved late from the offline queue,
-- and never double-counts: only a *change into* 'taken' subtracts one, and only a change *out of* 'taken' gives it back.
-- Medications with no quantity_on_hand (people who don't track supply) are left alone. Never goes below zero.
-- Runs as the signed-in user, so it can only touch medications that user owns (existing RLS).

create or replace function public.adjust_quantity_on_dose()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'taken' then
      update public.medications
        set quantity_on_hand = greatest(quantity_on_hand - 1, 0)
        where id = new.medication_id and quantity_on_hand is not null;
    end if;
  elsif tg_op = 'UPDATE' then
    if new.status = 'taken' and old.status <> 'taken' then
      update public.medications
        set quantity_on_hand = greatest(quantity_on_hand - 1, 0)
        where id = new.medication_id and quantity_on_hand is not null;
    elsif old.status = 'taken' and new.status <> 'taken' then
      update public.medications
        set quantity_on_hand = quantity_on_hand + 1
        where id = new.medication_id and quantity_on_hand is not null;
    end if;
  end if;
  return new;
end;
$$;

create trigger dose_logs_adjust_quantity
  after insert or update of status on dose_logs
  for each row execute procedure public.adjust_quantity_on_dose();
