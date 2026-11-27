-- WheelofWinners Supabase Auth identity mapping.
-- Links each application profile to its canonical Supabase Auth user.
-- Profile creation is server-triggered; client metadata never grants roles.

begin;

alter table public.profiles
  add constraint profiles_id_auth_users_fk
  foreign key (id) references auth.users(id) on delete cascade;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user_profile() from public, anon, authenticated;

create trigger on_auth_user_created_wheelofwinners
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

commit;
