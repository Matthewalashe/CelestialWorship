-- The app's owners, and the admin's overview of everything in the backend.
--
-- An owner is an email address. When an account with that address is confirmed (or already is), it becomes an
-- admin. Only confirmed addresses count, so nobody gains the role by signing up with someone else's email.
-- The list has no policies: only the database itself (migrations, the service role) can read or change it.

create table if not exists public.app_owners (
  email text primary key check (email = lower(email)),
  added_at timestamptz not null default now()
);
alter table public.app_owners enable row level security;

-- Owners are added outside the repo (it is public): insert into public.app_owners (email) values ('…');

-- Members still cannot raise their own role; the owner grant below is the one trusted path
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() and coalesce(current_setting('cw.trusted_role_change', true), '') <> 'on' then
    new.role := old.role;
    -- Choosing a role that needs verification puts the profile in the review queue
    if new.member_type in ('shepherd', 'independent_shepherd', 'church_admin') and (new.member_type is distinct from old.member_type) then
      new.verification_status := 'pending';
    elsif new.member_type in ('laity', 'church_worker') then
      new.verification_status := case when old.verification_status = 'verified' and new.member_type = old.member_type
                                      then 'verified' else 'unverified' end;
    else
      new.verification_status := old.verification_status;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.grant_owner_role(uid uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if exists (select 1 from auth.users u join public.app_owners o on o.email = lower(u.email)
             where u.id = uid and u.email_confirmed_at is not null) then
    perform set_config('cw.trusted_role_change', 'on', true);
    insert into public.profiles (id, display_name, role)
      select u.id, coalesce(u.raw_user_meta_data ->> 'display_name', split_part(u.email, '@', 1)), 'admin'
      from auth.users u where u.id = uid
      on conflict (id) do update set role = 'admin';
    perform set_config('cw.trusted_role_change', '', true);
  end if;
end;
$$;
revoke all on function public.grant_owner_role(uuid) from public, anon, authenticated;

create or replace function public.on_auth_user_confirmed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.grant_owner_role(new.id);
  return new;
end;
$$;
drop trigger if exists on_auth_user_owner on auth.users;
create trigger on_auth_user_owner after insert or update of email_confirmed_at on auth.users
  for each row when (new.email_confirmed_at is not null) execute function public.on_auth_user_confirmed();

-- Owners who already have a confirmed account
select public.grant_owner_role(u.id) from auth.users u join public.app_owners o on o.email = lower(u.email);

-- Everything going on, for admins only: one call, one JSON document
create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'generated_at', now(),
    'people', jsonb_build_object(
      'accounts', (select count(*) from auth.users),
      'confirmed', (select count(*) from auth.users where email_confirmed_at is not null),
      'new_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
      'new_30d', (select count(*) from auth.users where created_at > now() - interval '30 days'),
      'active_7d', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
      'by_role', (select coalesce(jsonb_object_agg(role, n), '{}') from (select role, count(*) n from profiles group by role) r),
      'by_member_type', (select coalesce(jsonb_object_agg(coalesce(member_type, 'not set'), n), '{}') from (select member_type, count(*) n from profiles group by member_type) r),
      'signups_by_day', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'n', n) order by d), '[]') from (
        select created_at::date d, count(*) n from auth.users where created_at > now() - interval '30 days' group by 1) s),
      'recent', (select coalesce(jsonb_agg(x order by x->>'created_at' desc), '[]') from (
        select jsonb_build_object('name', p.display_name, 'email', u.email, 'created_at', u.created_at,
                                  'confirmed', u.email_confirmed_at is not null, 'last_sign_in_at', u.last_sign_in_at,
                                  'role', p.role, 'member_type', p.member_type) x
        from auth.users u left join profiles p on p.id = u.id order by u.created_at desc limit 25) r)
    ),
    'queue', jsonb_build_object(
      'verifications', (select count(*) from verification_requests where status = 'pending'),
      'parishes', (select count(*) from parishes where status = 'pending'),
      'parish_leads', (select count(*) from parish_leads where status = 'new'),
      'parish_claims', (select count(*) from parish_claims where status = 'pending'),
      'prayers', (select count(*) from prayer_requests where status = 'pending'),
      'articles', (select count(*) from articles where status = 'pending'),
      'events', (select count(*) from events where status = 'pending'),
      'reports', (select count(*) from content_reports where status = 'open'),
      'translations', (select count(*) from hymn_translations where status = 'submitted')
    ),
    'content', jsonb_build_object(
      'parishes', (select count(*) from parishes where status = 'published'),
      'parishes_with_map_pin', (select count(*) from parishes where status = 'published' and latitude is not null),
      'parish_leads', (select count(*) from parish_leads),
      'articles', (select count(*) from articles where status = 'published'),
      'prayer_requests', (select count(*) from prayer_requests),
      'prayers_said', (select coalesce(sum(prayer_count), 0) from prayer_requests),
      'events_upcoming', (select count(*) from events where status = 'published' and starts_at > now()),
      'livestreams', (select count(*) from livestreams),
      'live_now', (select count(*) from parishes where live_now),
      'appointments', (select count(*) from appointments),
      'church_records', (select count(*) from church_records)
    ),
    'giving', jsonb_build_object(
      'by_currency', (select coalesce(jsonb_object_agg(currency, jsonb_build_object('paid_minor', paid, 'count', n)), '{}') from (
        select currency, sum(amount_minor) filter (where status in ('paid', 'fulfilled')) paid,
               count(*) filter (where status in ('paid', 'fulfilled')) n
        from donations group by currency) d),
      'pledges_open', (select count(*) from donations where status = 'pledged'),
      'failed_30d', (select count(*) from donations where status = 'failed' and created_at > now() - interval '30 days'),
      'recent', (select coalesce(jsonb_agg(x order by x->>'created_at' desc), '[]') from (
        select jsonb_build_object('purpose', purpose, 'amount_minor', amount_minor, 'currency', currency, 'status', status,
                                  'donor', case when is_anonymous then null else donor_name end, 'created_at', created_at) x
        from donations order by created_at desc limit 15) r),
      'subscriptions', (select coalesce(jsonb_object_agg(status, n), '{}') from (select status, count(*) n from parish_subscriptions group by status) s)
    ),
    'engagement', jsonb_build_object(
      'push_devices', (select count(*) from push_subscriptions),
      'push_sent_7d', (select count(*) from push_log where sent_at > now() - interval '7 days'),
      'game_players_this_week', (select count(distinct user_id) from game_scores where week_start >= date_trunc('week', now())::date),
      'library_items', (select count(*) from user_library),
      'events_7d', (select count(*) from analytics_events where created_at > now() - interval '7 days'),
      'devices_7d', (select count(distinct device_id) from analytics_events where created_at > now() - interval '7 days'),
      'top_events_7d', (select coalesce(jsonb_agg(jsonb_build_object('event', event, 'n', n) order by n desc), '[]') from (
        select event, count(*) n from analytics_events where created_at > now() - interval '7 days' group by event order by n desc limit 12) e),
      'platforms_7d', (select coalesce(jsonb_object_agg(coalesce(platform, 'unknown'), n), '{}') from (
        select platform, count(distinct device_id) n from analytics_events where created_at > now() - interval '7 days' group by platform) p)
    )
  ) into result;
  return result;
end;
$$;
revoke all on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;
