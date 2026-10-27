-- Analytics for admins: the anonymous events the app sends (hooks/useAnalytics): screens, sessions, installs,
-- actions and errors, summed over a range of days. Only admins can call it.

create index if not exists analytics_events_created_idx on public.analytics_events (created_at);
create index if not exists analytics_events_device_idx on public.analytics_events (device_id, created_at);
create index if not exists analytics_events_event_idx on public.analytics_events (event, created_at);

create or replace function public.admin_analytics(p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  since timestamptz := now() - make_interval(days => greatest(1, least(p_days, 365)));
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;

  with ev as (
    -- Device clocks can run ahead; a day's grace keeps those events in
    select * from analytics_events where created_at >= since and created_at <= now() + interval '1 day'
  ),
  first_seen as (
    select device_id, min(created_at) as at from analytics_events where device_id is not null group by device_id
  ),
  sessions as (
    select * from ev where event = 'session_start'
  ),
  days as (
    select generate_series(since::date, now()::date, interval '1 day')::date as day
  ),
  per_day as (
    select created_at::date as day,
           count(distinct device_id) as active,
           count(*) filter (where event = 'page_view') as views,
           count(*) filter (where event = 'session_start') as sessions,
           count(distinct device_id) filter (where event in ('app_installed', 'pwa_first_launch')) as installs
    from ev group by 1
  ),
  new_per_day as (
    select at::date as day, count(*) as new_devices from first_seen where at >= since group by 1
  ),
  daily as (
    select d.day, coalesce(p.active, 0) as active, coalesce(n.new_devices, 0) as new_devices, coalesce(p.views, 0) as views,
           coalesce(p.sessions, 0) as sessions, coalesce(p.installs, 0) as installs
    from days d left join per_day p using (day) left join new_per_day n using (day)
  ),
  cohort as (
    select device_id, at from first_seen where at between now() - interval '14 days' and now() - interval '7 days'
  ),
  breakdown as (
    select key, jsonb_object_agg(val, n) as counts from (
      select k.key,
             coalesce(nullif(s.properties ->> k.key, ''), case when k.key in ('referrer', 'utm_source') then 'direct' else 'unknown' end) as val,
             count(distinct s.device_id) as n
      from sessions s
      cross join (values ('language'), ('theme'), ('display'), ('referrer'), ('utm_source'), ('utm_campaign'), ('screen'), ('timezone'), ('version')) as k(key)
      group by 1, 2
    ) x group by key
  )
  select jsonb_build_object(
    'days', p_days,
    'totals', jsonb_build_object(
      'devices', (select count(distinct device_id) from ev),
      'new_devices', (select count(*) from first_seen where at >= since),
      'returning_devices', (select count(distinct e.device_id) from ev e join first_seen f using (device_id) where f.at < since),
      'sessions', (select count(*) from sessions),
      'views', (select count(*) from ev where event = 'page_view'),
      'events', (select count(*) from ev),
      'devices_all_time', (select count(*) from first_seen),
      'installed_devices', (select count(distinct device_id) from ev
                            where platform = 'pwa' or (event = 'session_start' and properties ->> 'display' = 'installed'))
    ),
    'daily', (select coalesce(jsonb_agg(to_jsonb(daily) order by day), '[]') from daily),
    'installs', jsonb_build_object(
      'install_page_views', (select count(*) from ev where event = 'page_view' and properties ->> 'path' = '/install'),
      'offered', (select count(distinct device_id) from ev where event = 'install_offered'),
      'prompt_accepted', (select count(*) from ev where event = 'install_prompt' and properties ->> 'outcome' = 'accepted'),
      'prompt_dismissed', (select count(*) from ev where event = 'install_prompt' and properties ->> 'outcome' = 'dismissed'),
      'banner_dismissed', (select count(*) from ev where event = 'install_banner_dismissed'),
      'installed', (select count(distinct device_id) from ev where event = 'app_installed'),
      'first_launches', (select count(distinct device_id) from ev where event = 'pwa_first_launch'),
      'by_platform', (select coalesce(jsonb_object_agg(coalesce(platform, 'unknown'), n), '{}') from (
        select platform, count(distinct device_id) n from ev where event in ('app_installed', 'pwa_first_launch') group by platform) p)
    ),
    'retention', jsonb_build_object(
      'cohort', (select count(*) from cohort),
      'returned', (select count(distinct e.device_id) from analytics_events e join cohort c using (device_id)
                   where e.created_at > now() - interval '7 days' and e.created_at > c.at + interval '1 day')
    ),
    'screens', (select coalesce(jsonb_agg(jsonb_build_object('path', path, 'views', n, 'devices', d) order by n desc), '[]') from (
      select coalesce(properties ->> 'path', '/' || coalesce(properties ->> 'page', '')) as path, count(*) n, count(distinct device_id) d
      from ev where event = 'page_view' group by 1 order by 2 desc limit 30) s),
    'actions', (select coalesce(jsonb_agg(jsonb_build_object('event', event, 'n', n, 'devices', d) order by n desc), '[]') from (
      select event, count(*) n, count(distinct device_id) d from ev
      where event not in ('page_view', 'session_start', 'error') group by event order by 2 desc limit 30) a),
    'activities', (select coalesce(jsonb_object_agg(coalesce(kind, 'other'), n), '{}') from (
      select properties ->> 'kind' as kind, count(*) n from ev where event = 'activity' group by 1) a),
    'games', (select coalesce(jsonb_object_agg(coalesce(game, 'other'), n), '{}') from (
      select properties ->> 'game' as game, count(*) n from ev where event = 'game_finished' group by 1) g),
    'shares', (select coalesce(jsonb_object_agg(coalesce(path, 'other'), n), '{}') from (
      select properties ->> 'path' as path, count(*) n from ev where event = 'share' group by 1 order by 2 desc limit 15) s),
    'languages_changed', (select coalesce(jsonb_object_agg(coalesce(lang, 'other'), n), '{}') from (
      select properties ->> 'to' as lang, count(*) n from ev where event = 'language_changed' group by 1) l),
    'platforms', (select coalesce(jsonb_object_agg(coalesce(platform, 'unknown'), n), '{}') from (
      select platform, count(distinct device_id) n from ev group by platform) p),
    'breakdown', (select coalesce(jsonb_object_agg(key, counts), '{}') from breakdown),
    'hours_lagos', (select coalesce(jsonb_agg(jsonb_build_object('hour', h, 'n', n) order by h), '[]') from (
      select extract(hour from created_at at time zone 'Africa/Lagos')::int h, count(*) n from ev where event = 'page_view' group by 1) x),
    'weekdays_lagos', (select coalesce(jsonb_agg(jsonb_build_object('dow', dw, 'n', n) order by dw), '[]') from (
      select extract(isodow from created_at at time zone 'Africa/Lagos')::int dw, count(*) n from ev where event = 'page_view' group by 1) x),
    'errors', jsonb_build_object(
      'count', (select count(*) from ev where event = 'error'),
      'devices', (select count(distinct device_id) from ev where event = 'error'),
      'top', (select coalesce(jsonb_agg(jsonb_build_object('message', m, 'n', n, 'path', p, 'last', l) order by n desc), '[]') from (
        select left(properties ->> 'message', 160) m, count(*) n, max(properties ->> 'path') p, max(created_at) l
        from ev where event = 'error' group by 1 order by 2 desc limit 12) e)
    )
  ) into result;
  return result;
end;
$$;
revoke all on function public.admin_analytics(int) from public, anon;
grant execute on function public.admin_analytics(int) to authenticated;
