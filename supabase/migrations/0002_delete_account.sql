-- Lets a signed-in user permanently delete their own account and everything under it.
-- The client can't delete from auth.users directly, so this runs as the function owner. Deleting the auth user
-- cascades (on delete cascade) through profiles → medications → dose_logs, appointments, and the subscriptions row.
-- Reminders rows aren't foreign-keyed, so they're cleared explicitly first.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  delete from public.reminders
  where (source_type = 'medication' and source_id in (
          select m.id from public.medications m join public.profiles p on p.id = m.profile_id where p.owner_id = uid))
     or (source_type = 'appointment' and source_id in (
          select a.id from public.appointments a join public.profiles p on p.id = a.profile_id where p.owner_id = uid));

  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
