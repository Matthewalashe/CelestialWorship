-- ─────────────────────────────────────────────────────────────
-- More about each parish, written by its own administrators
-- ─────────────────────────────────────────────────────────────
alter table public.parishes add column if not exists about text check (char_length(about) <= 4000);
alter table public.parishes add column if not exists founded_year int check (founded_year between 1947 and 2100);
alter table public.parishes add column if not exists worship_languages text[] check (cardinality(worship_languages) <= 8);
-- The hourly prayers (Àdúrà Wákàtí) at 9am, 12 noon, 3pm and 6pm
alter table public.parishes add column if not exists hourly_prayers boolean not null default false;
-- How close the map point is: 'address' (placed by the parish or found from its street address) or 'town'
alter table public.parishes add column if not exists geo_precision text check (geo_precision in ('address', 'place', 'town'));
alter table public.parishes drop constraint if exists parishes_point_pair;
alter table public.parishes add constraint parishes_point_pair check ((latitude is null) = (longitude is null)
  and (latitude is null or (latitude between -90 and 90 and longitude between -180 and 180)));

drop view if exists public.parish_directory;
create view public.parish_directory with (security_invoker = true) as
  select id, name, diocese, province, country, state_region, city, address, latitude, longitude, geo_precision, shepherd_name,
         case when contact_public then phone end as phone,
         case when contact_public then email end as email,
         website, map_url, social_links, service_times, giving_details,
         accepts_prayer_requests, accepts_appointments, kind, live_url, live_title, live_now, live_updated_at,
         live_channels, public.parish_has_plan(id) as partner, logo_url, cover_url,
         level, parent_id, ownership, affiliated, affiliation, continent, updated_at,
         about, founded_year, worship_languages, hourly_prayers
  from public.parishes where status = 'published';

-- A suggested parish arrives with its pin placed by the person who knows it
create or replace function public.publish_parish_lead(lead uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  l public.parish_leads;
  new_id uuid;
begin
  if not public.is_moderator() then
    raise exception 'Only moderators can add parishes' using errcode = '42501';
  end if;
  select * into l from public.parish_leads where id = lead and status = 'new' for update;
  if not found then
    raise exception 'This suggestion has already been handled';
  end if;
  insert into public.parishes (name, kind, country, state_region, city, address, latitude, longitude, geo_precision, shepherd_name, phone, email,
                               service_times, contact_public, status)
  values (l.name, 'parish', l.country, l.state_region, l.city, l.address, l.latitude, l.longitude,
          case when l.latitude is not null then 'address' end, l.shepherd_name, l.phone, l.email,
          case when l.sunday_time is not null then jsonb_build_array(jsonb_build_object('service', 'lords_day_service', 'day', 'Sunday', 'time', l.sunday_time)) end,
          false, 'published')
  returning id into new_id;
  update public.parish_leads set status = 'added', parish_id = new_id where id = lead;
  return new_id;
end $$;
