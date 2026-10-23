-- Church structure, shepherds' records and the public Library.
--   • parishes: level (parish, cathedral, circuit/district/state/province/regional/national HQ), parent,
--     sister parishes, ownership (community or private), affiliation
--   • independent ministries: the registrant owns it or supports it
--   • shepherds authenticated by their parish
--   • people's church records: birth, baptism, ranks, investiture, education, certificates,
--     studentship, stewardships, travels (private unless the person makes them public)
--   • Library: books and links to resources, besides articles

-- ─────────────────────────────────────────────────────────────
-- Parishes
-- ─────────────────────────────────────────────────────────────
alter table public.parishes add column if not exists level text not null default 'parish'
  check (level in ('parish', 'cathedral', 'circuit_hq', 'district_hq', 'state_hq', 'province_hq', 'regional_hq', 'diocesan_hq', 'national_hq', 'supreme_hq', 'international_hq'));
alter table public.parishes add column if not exists parent_id uuid references public.parishes (id) on delete set null;
alter table public.parishes add column if not exists ownership text not null default 'community' check (ownership in ('community', 'private'));
alter table public.parishes add column if not exists affiliated boolean not null default true;
alter table public.parishes add column if not exists affiliation text check (char_length(affiliation) <= 120);  -- e.g. "Supreme Headquarters, Porto-Novo"
alter table public.parishes add column if not exists continent text;
alter table public.parishes drop constraint if exists parishes_not_own_parent;
alter table public.parishes add constraint parishes_not_own_parent check (parent_id is null or parent_id <> id);

create table if not exists public.parish_relations (
  parish_id uuid not null references public.parishes (id) on delete cascade,
  related_id uuid not null references public.parishes (id) on delete cascade,
  relation text not null default 'sister' check (relation in ('sister', 'branch')),
  created_at timestamptz not null default now(),
  primary key (parish_id, related_id),
  check (parish_id <> related_id)
);
alter table public.parish_relations enable row level security;
drop policy if exists "relations: read" on public.parish_relations;
create policy "relations: read" on public.parish_relations for select using (true);
drop policy if exists "relations: parish admins" on public.parish_relations;
create policy "relations: parish admins" on public.parish_relations for all
  using (public.is_parish_admin(parish_id)) with check (public.is_parish_admin(parish_id));

-- Columns change between versions, which create or replace view does not allow
drop view if exists public.parish_directory;
create view public.parish_directory with (security_invoker = true) as
  select id, name, diocese, province, country, state_region, city, address, latitude, longitude, shepherd_name,
         case when contact_public then phone end as phone,
         case when contact_public then email end as email,
         website, map_url, social_links, service_times, giving_details,
         accepts_prayer_requests, accepts_appointments, kind, live_url, live_title, live_now, live_updated_at,
         live_channels, public.parish_has_plan(id) as partner, logo_url, cover_url,
         level, parent_id, ownership, affiliated, affiliation, continent, updated_at
  from public.parishes where status = 'published';

-- ─────────────────────────────────────────────────────────────
-- Team: owner or supporting minister; office in the page
-- ─────────────────────────────────────────────────────────────
alter table public.parish_admins add column if not exists relationship text check (relationship in ('owner', 'supporting'));
alter table public.parish_admins add column if not exists office text check (char_length(office) <= 80);   -- e.g. "Shepherd-in-charge", "Assistant shepherd"

-- The person who registers a ministry says whether they own it or support it
create or replace function public.claim_new_ministry()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  rel text := coalesce(new.registrant_relationship, 'owner');
begin
  if new.submitted_by is not null then
    insert into public.parish_admins (parish_id, user_id, role, verified, relationship, office)
    values (new.id, new.submitted_by,
            case when new.kind = 'ministry' then 'shepherd' else 'admin' end, false,
            case when new.kind = 'ministry' then rel end,
            case when new.kind <> 'ministry' then null when rel = 'owner' then 'Founder' else 'Supporting minister' end)
    on conflict do nothing;
  end if;
  return new;
end;
$$;
alter table public.parishes add column if not exists registrant_relationship text check (registrant_relationship in ('owner', 'supporting'));

-- ─────────────────────────────────────────────────────────────
-- Shepherds: rank, office, and authentication by their parish
-- ─────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists rank text check (char_length(rank) <= 80);
alter table public.profiles add column if not exists rank_line text check (rank_line in ('men', 'women'));
alter table public.profiles add column if not exists office text check (char_length(office) <= 80);          -- e.g. "Head of Province"
alter table public.profiles add column if not exists office_scope text check (char_length(office_scope) <= 120); -- e.g. "Lagos Province 3"
alter table public.profiles add column if not exists bio text check (char_length(bio) <= 2000);
alter table public.profiles add column if not exists authenticated_by uuid references public.parishes (id) on delete set null;

create or replace view public.public_profiles as
  select id, display_name, church_title, member_type, verification_status, parish_id,
         case when phone_public then phone end as phone,
         avatar_url, banner_url, rank, rank_line, office, office_scope, bio, authenticated_by
  from public.profiles;
grant select on public.public_profiles to anon, authenticated;

-- People who say they are a shepherd of this parish, waiting for the parish to confirm them
create or replace function public.parish_shepherd_claims(pid uuid)
returns table (id uuid, display_name text, church_title text, rank text, member_type text)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.church_title, p.rank, p.member_type from public.profiles p
  where public.is_parish_admin(pid) and p.parish_id = pid and p.member_type = 'shepherd'
    and (p.verification_status <> 'verified' or p.authenticated_by is distinct from pid)
    and not exists (select 1 from public.parish_admins a where a.parish_id = pid and a.user_id = p.id and a.verified and a.role = 'shepherd');
$$;
grant execute on function public.parish_shepherd_claims(uuid) to authenticated;

-- A parish's shepherd or administrator confirms one of its shepherds
create or replace function public.authenticate_shepherd(pid uuid, uid uuid, p_office text default 'Shepherd')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.parish_admins where parish_id = pid and user_id = auth.uid() and verified and role in ('shepherd', 'admin'))
     and not public.is_moderator() then
    raise exception 'Only a verified shepherd or administrator of this parish can authenticate its shepherds' using errcode = '42501';
  end if;
  update public.profiles set verification_status = 'verified', authenticated_by = pid where id = uid and member_type = 'shepherd';
  insert into public.parish_admins (parish_id, user_id, role, verified, office)
  values (pid, uid, 'shepherd', true, p_office)
  on conflict (parish_id, user_id) do update set role = 'shepherd', verified = true, office = excluded.office;
end;
$$;
grant execute on function public.authenticate_shepherd(uuid, uuid, text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Church records and ministry CV
-- ─────────────────────────────────────────────────────────────
create table if not exists public.church_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  kind text not null check (kind in ('birth', 'baptism', 'rank', 'investiture', 'anointing', 'ordination', 'education',
                                     'certificate', 'studentship', 'stewardship', 'travel', 'other')),
  title text check (char_length(title) <= 160),          -- rank name, qualification, office held…
  parish_id uuid references public.parishes (id) on delete set null,
  place text check (char_length(place) <= 160),           -- parish or institution name as written
  officiant text check (char_length(officiant) <= 160),   -- shepherd who baptised/anointed, teacher, mentor
  start_date date,
  end_date date,
  details text check (char_length(details) <= 1000),
  is_public boolean not null default false,
  born_in_ccc boolean,                                    -- birth records
  created_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create index if not exists church_records_user_idx on public.church_records (user_id, kind, start_date);
alter table public.church_records enable row level security;
drop policy if exists "records: own" on public.church_records;
create policy "records: own" on public.church_records for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "records: public" on public.church_records;
create policy "records: public" on public.church_records for select using (is_public);
-- A parish's leaders can see the records of people who belong to it (for church registers)
drop policy if exists "records: parish leaders" on public.church_records;
create policy "records: parish leaders" on public.church_records for select
  using (exists (select 1 from public.profiles p where p.id = user_id and p.parish_id is not null and public.is_parish_admin(p.parish_id)));
drop trigger if exists rate_limit on public.church_records;
create trigger rate_limit before insert on public.church_records for each row execute function public.rate_limit('user_id', '60');

-- ─────────────────────────────────────────────────────────────
-- Library: books and resources (articles are already there)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.library_items (
  id uuid primary key default gen_random_uuid(),
  added_by uuid not null references auth.users (id) on delete cascade default auth.uid(),
  author_name text not null check (char_length(author_name) between 2 and 120),   -- the book's author, as printed
  kind text not null check (kind in ('book', 'booklet', 'sermon', 'study', 'audio', 'video', 'link')),
  title text not null check (char_length(title) between 3 and 200),
  description text check (char_length(description) <= 2000),
  language text not null default 'en' check (language in ('en', 'yo', 'egun', 'fr', 'other')),
  url text check (public.is_https_url(url)),                 -- an outside link, or the uploaded file
  storage_path text,                                         -- set when the file is in our storage
  cover_url text check (public.is_https_url(cover_url)),
  status text not null default 'pending' check (status in ('pending', 'published', 'hidden')),
  created_at timestamptz not null default now(),
  check (url is not null)
);
create index if not exists library_items_idx on public.library_items (status, created_at desc);
alter table public.library_items enable row level security;
drop policy if exists "library: read" on public.library_items;
create policy "library: read" on public.library_items for select using (status = 'published' or added_by = auth.uid() or public.is_moderator());
drop policy if exists "library: add" on public.library_items;
create policy "library: add" on public.library_items for insert with check (auth.uid() = added_by);
drop policy if exists "library: edit own" on public.library_items;
create policy "library: edit own" on public.library_items for update using (auth.uid() = added_by or public.is_moderator());
drop policy if exists "library: delete own" on public.library_items;
create policy "library: delete own" on public.library_items for delete using (auth.uid() = added_by or public.is_moderator());

-- Verified shepherds publish straight away; everyone else is reviewed by a moderator
create or replace function public.library_status_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_moderator() then return new; end if;
  if tg_op = 'INSERT' or new.status is distinct from old.status or new.url is distinct from old.url then
    new.status := case when public.is_trusted_author(auth.uid()) then 'published' else 'pending' end;
  end if;
  new.added_by := coalesce(old.added_by, auth.uid());
  return new;
end;
$$;
drop trigger if exists library_status_guard on public.library_items;
create trigger library_status_guard before insert or update on public.library_items for each row execute function public.library_status_guard();
drop trigger if exists rate_limit on public.library_items;
create trigger rate_limit before insert on public.library_items for each row execute function public.rate_limit('added_by', '10');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('library', 'library', true, 31457280, array['application/pdf', 'application/epub+zip', 'image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "library files: own folder" on storage.objects;
create policy "library files: own folder" on storage.objects for all to authenticated
  using (bucket_id = 'library' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'library' and (storage.foldername(name))[1] = auth.uid()::text);

-- ─────────────────────────────────────────────────────────────
-- Claiming a parish: shepherds and administrators of a listed parish apply with evidence.
-- A moderator approves: the parish is published (or updated) with their contact and they get the role.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.parish_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  listed_id text,                                       -- an entry of public/data/parishes_listed.json or the seed
  parish_id uuid references public.parishes (id) on delete cascade,   -- or a parish already in the directory
  role text not null check (role in ('shepherd', 'admin', 'parochial_committee', 'media', 'choir')),
  office text check (char_length(office) <= 80),        -- e.g. Shepherd-in-charge
  -- The parish as the claimant knows it now
  details jsonb not null default '{}',                  -- {name, country, state_region, city, address, phone, email, shepherd_name}
  evidence_paths text[] not null default '{}',          -- files in the private "evidence" bucket
  note text check (char_length(note) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  check (listed_id is not null or parish_id is not null),
  check (cardinality(evidence_paths) between 1 and 5)
);
create index if not exists parish_claims_status_idx on public.parish_claims (status, created_at);
alter table public.parish_claims enable row level security;
drop policy if exists "claims: own" on public.parish_claims;
create policy "claims: own" on public.parish_claims for select using (auth.uid() = user_id or public.is_moderator());
drop policy if exists "claims: submit" on public.parish_claims;
create policy "claims: submit" on public.parish_claims for insert with check (auth.uid() = user_id and status = 'pending');
drop policy if exists "claims: review" on public.parish_claims;
create policy "claims: review" on public.parish_claims for update using (public.is_moderator());
drop trigger if exists rate_limit on public.parish_claims;
create trigger rate_limit before insert on public.parish_claims for each row execute function public.rate_limit('user_id', '5');

-- Evidence is private: the claimant and moderators only
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('evidence', 'evidence', false, 10485760, array['application/pdf', 'image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "evidence: own folder" on storage.objects;
create policy "evidence: own folder" on storage.objects for all to authenticated
  using (bucket_id = 'evidence' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_moderator()))
  with check (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);

-- Approve a claim (moderators): create or update the parish, give the claimant the role, verify a shepherd
create or replace function public.approve_parish_claim(claim_id uuid, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  c public.parish_claims;
  pid uuid;
  d jsonb;
begin
  if not public.is_moderator() then raise exception 'Moderators only' using errcode = '42501'; end if;
  select * into c from public.parish_claims where id = claim_id for update;
  if c is null or c.status <> 'pending' then raise exception 'This claim is not waiting for review'; end if;
  d := c.details;
  pid := c.parish_id;
  if pid is null then
    -- A listed parish becomes a real one, with the claimant's details
    insert into public.parishes (name, country, state_region, city, address, phone, email, shepherd_name, kind, status, submitted_by, contact_public, continent)
    values (d ->> 'name', d ->> 'country', d ->> 'state_region', d ->> 'city', d ->> 'address', d ->> 'phone', d ->> 'email',
            d ->> 'shepherd_name', 'parish', 'published', c.user_id, coalesce((d ->> 'contact_public')::boolean, true), d ->> 'continent')
    returning id into pid;
  else
    -- An existing parish takes the claimant's current contact details
    update public.parishes set
      address = coalesce(nullif(d ->> 'address', ''), address), phone = coalesce(nullif(d ->> 'phone', ''), phone),
      email = coalesce(nullif(d ->> 'email', ''), email), shepherd_name = coalesce(nullif(d ->> 'shepherd_name', ''), shepherd_name),
      updated_at = now()
    where id = pid;
  end if;
  insert into public.parish_admins (parish_id, user_id, role, verified, office)
  values (pid, c.user_id, c.role, true, c.office)
  on conflict (parish_id, user_id) do update set role = excluded.role, verified = true, office = excluded.office;
  update public.profiles set parish_id = pid,
         verification_status = case when c.role = 'shepherd' then 'verified' else verification_status end,
         authenticated_by = case when c.role = 'shepherd' then pid else authenticated_by end
   where id = c.user_id;
  update public.parish_claims set status = 'approved', parish_id = pid, reviewed_by = auth.uid(), review_note = p_note where id = claim_id;
  return pid;
end;
$$;
grant execute on function public.approve_parish_claim(uuid, text) to authenticated;
