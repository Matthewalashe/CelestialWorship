-- Pictures and videos: profile photos and banners, parish logos and covers, parish galleries.
-- Images are resized to WebP on the phone before upload (src/utils/imageResize.ts), so files stay small.

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists banner_url text;
alter table public.parishes add column if not exists logo_url text;
alter table public.parishes add column if not exists cover_url text;

-- Only pictures from our own storage (no hot-linking arbitrary sites)
create or replace function public.is_storage_url(u text)
returns boolean language sql immutable as $$
  select u is null or u ~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/(avatars|parish-media)/';
$$;
alter table public.profiles drop constraint if exists profiles_media_urls;
alter table public.profiles add constraint profiles_media_urls check (public.is_storage_url(avatar_url) and public.is_storage_url(banner_url));
alter table public.parishes drop constraint if exists parishes_media_urls;
alter table public.parishes add constraint parishes_media_urls check (public.is_storage_url(logo_url) and public.is_storage_url(cover_url));

create or replace view public.public_profiles as
  select id, display_name, church_title, member_type, verification_status, parish_id,
         case when phone_public then phone end as phone,
         avatar_url, banner_url
  from public.profiles;
grant select on public.public_profiles to anon, authenticated;

-- Columns change between versions, which create or replace view does not allow
drop view if exists public.parish_directory;
create view public.parish_directory with (security_invoker = true) as
  select id, name, diocese, province, country, state_region, city, address, latitude, longitude, shepherd_name,
         case when contact_public then phone end as phone,
         case when contact_public then email end as email,
         website, map_url, social_links, service_times, giving_details,
         accepts_prayer_requests, accepts_appointments, kind, live_url, live_title, live_now, live_updated_at,
         live_channels, public.parish_has_plan(id) as partner, logo_url, cover_url, updated_at
  from public.parishes where status = 'published';

-- ─────────────────────────────────────────────────────────────
-- Parish galleries
-- ─────────────────────────────────────────────────────────────
create table if not exists public.parish_media (
  id uuid primary key default gen_random_uuid(),
  parish_id uuid not null references public.parishes (id) on delete cascade,
  kind text not null check (kind in ('image', 'video')),
  url text not null,                -- public URL in the parish-media bucket, or an https video link (YouTube…)
  storage_path text,                -- set when the file is in our storage, so it can be deleted
  caption text check (char_length(caption) <= 200),
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  check (public.is_https_url(url))
);
create index if not exists parish_media_idx on public.parish_media (parish_id, created_at desc);
alter table public.parish_media enable row level security;
drop policy if exists "media: read" on public.parish_media;
create policy "media: read" on public.parish_media for select
  using (exists (select 1 from public.parishes p where p.id = parish_id and p.status = 'published') or public.is_parish_team(parish_id));
drop policy if exists "media: team" on public.parish_media;
create policy "media: team" on public.parish_media for all
  using (public.has_parish_role(parish_id, array['media']))
  with check (public.has_parish_role(parish_id, array['media']));

-- ─────────────────────────────────────────────────────────────
-- Storage buckets (public read; size and type limits)
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 2097152, array['image/webp', 'image/jpeg', 'image/png']),
  ('parish-media', 'parish-media', true, 52428800, array['image/webp', 'image/jpeg', 'image/png', 'video/mp4', 'video/webm'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Avatars: each person writes only inside their own folder  avatars/<user id>/…
drop policy if exists "avatars: own folder" on storage.objects;
create policy "avatars: own folder" on storage.objects for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Parish media: the parish's media team writes inside  parish-media/<parish id>/…
drop policy if exists "parish media: team folder" on storage.objects;
create policy "parish media: team folder" on storage.objects for all to authenticated
  using (bucket_id = 'parish-media' and public.has_parish_role(((storage.foldername(name))[1])::uuid, array['media']))
  with check (bucket_id = 'parish-media' and public.has_parish_role(((storage.foldername(name))[1])::uuid, array['media']));

-- ─────────────────────────────────────────────────────────────
-- Rate limits on public posting (PRINCIPLES §3): bounded per person per hour
-- ─────────────────────────────────────────────────────────────
create or replace function public.rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  recent integer;
  cap integer := tg_argv[1]::integer;
begin
  if public.is_moderator() then return new; end if;
  execute format('select count(*) from public.%I where %I = $1 and created_at > now() - interval ''1 hour''', tg_table_name, tg_argv[0])
    into recent using auth.uid();
  if recent >= cap then
    raise exception 'Please wait a little before posting again' using errcode = '54000';
  end if;
  return new;
end;
$$;
drop trigger if exists rate_limit on public.prayer_requests;
create trigger rate_limit before insert on public.prayer_requests for each row execute function public.rate_limit('user_id', '5');
drop trigger if exists rate_limit on public.article_comments;
create trigger rate_limit before insert on public.article_comments for each row execute function public.rate_limit('user_id', '20');
drop trigger if exists rate_limit on public.content_reports;
create trigger rate_limit before insert on public.content_reports for each row execute function public.rate_limit('reporter_id', '20');
drop trigger if exists rate_limit on public.events;
create trigger rate_limit before insert on public.events for each row execute function public.rate_limit('submitted_by', '10');
drop trigger if exists rate_limit on public.parish_media;
create trigger rate_limit before insert on public.parish_media for each row execute function public.rate_limit('created_by', '60');
