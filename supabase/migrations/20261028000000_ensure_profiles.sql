-- Accounts created before the profiles table existed have no profile row, so saving their
-- profile did nothing. Give every account one, and let the app repair a missing row at sign-in.

insert into public.profiles (id, display_name)
select u.id, coalesce(u.raw_user_meta_data ->> 'display_name', split_part(u.email, '@', 1))
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

create or replace function public.ensure_profile()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.profiles (id, display_name)
  select u.id, coalesce(u.raw_user_meta_data ->> 'display_name', split_part(u.email, '@', 1))
  from auth.users u where u.id = auth.uid()
  on conflict (id) do nothing;
end;
$$;
revoke all on function public.ensure_profile() from public, anon;
grant execute on function public.ensure_profile() to authenticated;
