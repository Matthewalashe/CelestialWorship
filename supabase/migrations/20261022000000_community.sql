-- CelestialWorship community backend
-- Apply with the Supabase CLI (`supabase db push`) or paste into the SQL editor.
-- Every table has Row Level Security. Privileged fields (role, verification) can only be
-- changed by moderators/admins, enforced by triggers as well as policies.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- Parishes (church directory; also "church accounts")
-- ─────────────────────────────────────────────────────────────
create table if not exists public.parishes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 160),
  -- 'parish' = a congregation; 'ministry' = an independent shepherd's ministry not attached to a parish
  kind text not null default 'parish' check (kind in ('parish', 'ministry')),
  -- Diocese / province / district as the church organises it locally
  diocese text,
  province text,
  country text not null,
  state_region text,
  city text,
  address text,
  latitude double precision,
  longitude double precision,
  shepherd_name text,
  -- Contact details are shown publicly only when the parish has agreed to it
  phone text,
  email text,
  website text,
  contact_public boolean not null default false,
  service_times jsonb,                       -- e.g. [{"service":"lords_day_service","time":"10:00"}]
  -- Donation details the parish publishes (bank account, Paystack/Flutterwave page link)
  giving_details jsonb,
  -- Livestream (YouTube / Facebook / any link); live_now shows it on the Live page
  live_url text,
  live_title text,
  live_now boolean not null default false,
  live_updated_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  submitted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists parishes_country_idx on public.parishes (country, state_region);
create index if not exists parishes_status_idx on public.parishes (status);

-- ─────────────────────────────────────────────────────────────
-- Profiles
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  -- App permission level: set by admins only
  role text not null default 'member' check (role in ('member', 'moderator', 'admin')),
  -- How the person serves in church (self-declared; shepherd/church_admin need verification)
  member_type text not null default 'laity' check (member_type in ('laity', 'church_worker', 'shepherd', 'independent_shepherd', 'church_admin')),
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'pending', 'verified', 'rejected')),
  church_title text,                         -- e.g. Brother, Sister, Leader, Elder, Evangelist (free text)
  ministry text,                             -- choir, ushering, prayer band, youth…
  parish_id uuid references public.parishes (id) on delete set null,
  country text,
  state_region text,
  phone text,
  phone_public boolean not null default false,
  birthday date,
  preferred_language text not null default 'en' check (preferred_language in ('en', 'yo', 'fr')),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_moderator(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = uid and role in ('moderator', 'admin'));
$$;

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = uid and role = 'admin');
$$;

-- Create a profile for every new account
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Members cannot raise their own role or mark themselves verified
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then
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
drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields before update on public.profiles
  for each row execute function public.protect_profile_fields();

alter table public.profiles enable row level security;
-- Full profiles (phone, birthday…) are visible to their owner and moderators only
drop policy if exists "profiles: read own or public basics" on public.profiles;
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles for select
  using (auth.uid() = id or public.is_moderator());

-- What other members may see: name, church title, how they serve, parish, and phone only if shared
create or replace view public.public_profiles as
  select id, display_name, church_title, member_type, verification_status, parish_id,
         case when phone_public then phone end as phone
  from public.profiles;
grant select on public.public_profiles to anon, authenticated;
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles for update
  using (auth.uid() = id or public.is_moderator());

-- Parish administrators (shepherds and church admins of a parish)
create table if not exists public.parish_admins (
  parish_id uuid not null references public.parishes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- shepherd/admin: everything · parochial_committee: giving, events, prayer requests · media: livestream, events · choir: events
  role text not null default 'admin' check (role in ('shepherd', 'admin', 'parochial_committee', 'media', 'choir', 'editor')),
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (parish_id, user_id)
);

-- Full administrators of a parish/ministry: its shepherds and admins
create or replace function public.is_parish_admin(pid uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.parish_admins
                 where parish_id = pid and user_id = uid and verified and role in ('shepherd', 'admin'))
      or public.is_moderator(uid);
$$;

-- A verified team member holding one of the given roles (shepherds and admins always qualify)
create or replace function public.has_parish_role(pid uuid, roles text[], uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.parish_admins
                 where parish_id = pid and user_id = uid and verified
                   and (role = any (roles) or role in ('shepherd', 'admin')))
      or public.is_moderator(uid);
$$;

-- Anyone on the parish's verified team
create or replace function public.is_parish_team(pid uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.parish_admins where parish_id = pid and user_id = uid and verified)
      or public.is_moderator(uid);
$$;

alter table public.parish_admins enable row level security;
drop policy if exists "parish_admins: read" on public.parish_admins;
create policy "parish_admins: read" on public.parish_admins for select using (true);
drop policy if exists "parish_admins: request" on public.parish_admins;
create policy "parish_admins: request" on public.parish_admins for insert
  with check (auth.uid() = user_id and verified = false);
drop policy if exists "parish_admins: moderate" on public.parish_admins;
create policy "parish_admins: moderate" on public.parish_admins for update using (public.is_moderator());
drop policy if exists "parish_admins: leave" on public.parish_admins;
create policy "parish_admins: leave" on public.parish_admins for delete using (auth.uid() = user_id or public.is_moderator());

alter table public.parishes enable row level security;
drop policy if exists "parishes: read published" on public.parishes;
create policy "parishes: read published" on public.parishes for select
  using (status = 'published' or submitted_by = auth.uid() or public.is_parish_team(id));
drop policy if exists "parishes: submit" on public.parishes;
create policy "parishes: submit" on public.parishes for insert
  with check (auth.uid() = submitted_by and status = 'pending');
drop policy if exists "parishes: edit by admins" on public.parishes;
create policy "parishes: edit by admins" on public.parishes for update
  using (public.has_parish_role(id, array['media']) or (submitted_by = auth.uid() and status = 'pending'));

-- Keep personal contact out of the public listing unless the parish agreed
create or replace view public.parish_directory with (security_invoker = true) as
  select id, name, diocese, province, country, state_region, city, address, latitude, longitude, shepherd_name,
         case when contact_public then phone end as phone,
         case when contact_public then email end as email,
         website, service_times, giving_details, updated_at
  from public.parishes where status = 'published';

-- Verification requests (shepherd / church admin), reviewed by moderators
create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  member_type text not null check (member_type in ('shepherd', 'independent_shepherd', 'church_admin', 'church_worker')),
  parish_id uuid references public.parishes (id) on delete set null,
  details text,                               -- e.g. ordination year, who can vouch
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.verification_requests enable row level security;
drop policy if exists "verification: own or moderator" on public.verification_requests;
create policy "verification: own or moderator" on public.verification_requests for select
  using (auth.uid() = user_id or public.is_moderator());
drop policy if exists "verification: request" on public.verification_requests;
create policy "verification: request" on public.verification_requests for insert
  with check (auth.uid() = user_id and status = 'pending');
drop policy if exists "verification: review" on public.verification_requests;
create policy "verification: review" on public.verification_requests for update using (public.is_moderator());

-- Approving a request verifies the profile and the parish admin link
create or replace function public.apply_verification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and old.status <> 'approved' then
    update public.profiles set member_type = new.member_type, verification_status = 'verified',
           parish_id = coalesce(new.parish_id, parish_id)
     where id = new.user_id;
    if new.parish_id is not null and new.member_type in ('shepherd', 'independent_shepherd', 'church_admin') then
      insert into public.parish_admins (parish_id, user_id, role, verified)
      values (new.parish_id, new.user_id, case when new.member_type in ('shepherd', 'independent_shepherd') then 'shepherd' else 'admin' end, true)
      on conflict (parish_id, user_id) do update set verified = true, role = excluded.role;
    end if;
  elsif new.status = 'rejected' and old.status <> 'rejected' then
    update public.profiles set verification_status = 'rejected' where id = new.user_id;
  end if;
  new.reviewed_at := now();
  new.reviewed_by := auth.uid();
  return new;
end;
$$;
drop trigger if exists apply_verification on public.verification_requests;
create trigger apply_verification before update on public.verification_requests
  for each row execute function public.apply_verification();

-- ─────────────────────────────────────────────────────────────
-- Personal library backup (only the owner can read it)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.user_library (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.user_library enable row level security;
drop policy if exists "library: owner only" on public.user_library;
create policy "library: owner only" on public.user_library for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- The old anonymous notes backup is no longer used by the app
drop table if exists public.user_notes;

-- ─────────────────────────────────────────────────────────────
-- Prayer requests (shared with the church, moderated)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  display_name text,                          -- null when anonymous
  is_anonymous boolean not null default false,
  title text not null check (char_length(title) between 3 and 140),
  body text check (char_length(body) <= 2000),
  category text,
  parish_id uuid references public.parishes (id) on delete set null,
  -- "church" = everyone in the app, "parish" = only that parish's members, "shepherd" = parish shepherd only
  visibility text not null default 'church' check (visibility in ('church', 'parish', 'shepherd')),
  status text not null default 'pending' check (status in ('pending', 'published', 'answered', 'hidden')),
  testimony text,
  prayer_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists prayer_requests_status_idx on public.prayer_requests (status, created_at desc);

alter table public.prayer_requests enable row level security;
drop policy if exists "prayer: read" on public.prayer_requests;
create policy "prayer: read" on public.prayer_requests for select using (
  user_id = auth.uid()
  or public.is_moderator()
  or (status in ('published', 'answered') and (
        visibility = 'church'
        or (visibility = 'parish' and parish_id = (select parish_id from public.profiles where id = auth.uid()))
        or (visibility = 'shepherd' and public.has_parish_role(parish_id, array['shepherd']))
        or (visibility <> 'shepherd' and public.has_parish_role(parish_id, array['parochial_committee']))
  ))
);
drop policy if exists "prayer: submit" on public.prayer_requests;
create policy "prayer: submit" on public.prayer_requests for insert
  with check (auth.uid() = user_id and status = 'pending');
drop policy if exists "prayer: owner updates" on public.prayer_requests;
create policy "prayer: owner updates" on public.prayer_requests for update
  using (auth.uid() = user_id or public.is_moderator());
drop policy if exists "prayer: owner deletes" on public.prayer_requests;
create policy "prayer: owner deletes" on public.prayer_requests for delete
  using (auth.uid() = user_id or public.is_moderator());

-- One "I prayed" per person per request
create table if not exists public.prayer_support (
  request_id uuid not null references public.prayer_requests (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (request_id, user_id)
);
alter table public.prayer_support enable row level security;
drop policy if exists "support: read" on public.prayer_support;
create policy "support: read" on public.prayer_support for select using (true);
drop policy if exists "support: add own" on public.prayer_support;
create policy "support: add own" on public.prayer_support for insert with check (auth.uid() = user_id);

create or replace function public.count_prayer_support()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.prayer_requests set prayer_count = prayer_count + 1 where id = new.request_id;
  return new;
end;
$$;
drop trigger if exists count_prayer_support on public.prayer_support;
create trigger count_prayer_support after insert on public.prayer_support
  for each row execute function public.count_prayer_support();

-- ─────────────────────────────────────────────────────────────
-- Articles & commentaries
-- ─────────────────────────────────────────────────────────────
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  kind text not null default 'article' check (kind in ('article', 'bible_commentary', 'lesson_commentary', 'hymn_commentary', 'devotional', 'testimony', 'sermon_notes')),
  title text not null check (char_length(title) between 3 and 160),
  summary text check (char_length(summary) <= 300),
  body text not null check (char_length(body) between 20 and 40000),   -- Markdown
  language text not null default 'en',
  -- What it comments on: {"kind":"bible","book":"John","chapter":3,"verseStart":16,"verseEnd":16} / {"kind":"hymn","number":5} / {"kind":"lesson","date":"2026-06-14"}
  reference jsonb,
  tags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'submitted', 'published', 'rejected', 'archived')),
  moderation_note text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists articles_published_idx on public.articles (status, published_at desc);
create index if not exists articles_reference_idx on public.articles using gin (reference);

-- Authors may write and submit; only moderators publish
-- Verified shepherds (parish or independent) publish without waiting for a moderator
create or replace function public.is_trusted_author(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                 where id = uid and verification_status = 'verified' and member_type in ('shepherd', 'independent_shepherd'));
$$;

create or replace function public.protect_article_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then
    if new.status = 'submitted' and public.is_trusted_author(new.author_id) then
      new.status := 'published';
    elsif new.status = 'rejected' or (new.status = 'published' and not public.is_trusted_author(new.author_id)
          and (tg_op = 'INSERT' or new.status is distinct from old.status)) then
      new.status := 'submitted';
    end if;
    if tg_op = 'UPDATE' and old.status = 'published' and new.body is distinct from old.body
       and not public.is_trusted_author(new.author_id) then
      new.status := 'submitted';          -- edits to a published article go back for review
    end if;
    new.moderation_note := case when tg_op = 'UPDATE' then old.moderation_note else null end;
  end if;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    new.published_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists protect_article_status on public.articles;
create trigger protect_article_status before insert or update on public.articles
  for each row execute function public.protect_article_status();

alter table public.articles enable row level security;
drop policy if exists "articles: read" on public.articles;
create policy "articles: read" on public.articles for select
  using (status = 'published' or author_id = auth.uid() or public.is_moderator());
drop policy if exists "articles: write own" on public.articles;
create policy "articles: write own" on public.articles for insert with check (auth.uid() = author_id);
drop policy if exists "articles: edit own" on public.articles;
create policy "articles: edit own" on public.articles for update using (auth.uid() = author_id or public.is_moderator());
drop policy if exists "articles: delete own" on public.articles;
create policy "articles: delete own" on public.articles for delete using (auth.uid() = author_id or public.is_moderator());

create table if not exists public.article_reactions (
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'amen' check (kind in ('amen', 'helpful')),
  created_at timestamptz not null default now(),
  primary key (article_id, user_id, kind)
);
alter table public.article_reactions enable row level security;
drop policy if exists "reactions: read" on public.article_reactions;
create policy "reactions: read" on public.article_reactions for select using (true);
drop policy if exists "reactions: own" on public.article_reactions;
create policy "reactions: own" on public.article_reactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.article_comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  body text not null check (char_length(body) between 1 and 2000),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now()
);
alter table public.article_comments enable row level security;
drop policy if exists "comments: read" on public.article_comments;
create policy "comments: read" on public.article_comments for select using (status = 'published' or user_id = auth.uid() or public.is_moderator());
drop policy if exists "comments: write" on public.article_comments;
create policy "comments: write" on public.article_comments for insert with check (auth.uid() = user_id and status = 'published');
drop policy if exists "comments: moderate" on public.article_comments;
create policy "comments: moderate" on public.article_comments for update using (public.is_moderator());
drop policy if exists "comments: delete own" on public.article_comments;
create policy "comments: delete own" on public.article_comments for delete using (auth.uid() = user_id or public.is_moderator());

-- ─────────────────────────────────────────────────────────────
-- Events calendar
-- ─────────────────────────────────────────────────────────────
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 140),
  description text check (char_length(description) <= 4000),
  category text not null default 'social' check (category in ('service', 'social', 'youth', 'harvest', 'anniversary', 'convention', 'crusade', 'wedding', 'memorial', 'meeting', 'other')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  location text,
  parish_id uuid references public.parishes (id) on delete set null,
  -- 'church' events are shown to everyone; 'parish' events to that parish's members first
  scope text not null default 'parish' check (scope in ('church', 'parish')),
  contact text,
  image_url text,
  status text not null default 'pending' check (status in ('pending', 'published', 'cancelled', 'rejected')),
  submitted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create index if not exists events_starts_idx on public.events (status, starts_at);

-- Verified parish admins publish their own parish's events directly
create or replace function public.event_status_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then
    if new.status = 'published' and not (new.parish_id is not null and public.is_parish_team(new.parish_id)) then
      new.status := 'pending';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists event_status_guard on public.events;
create trigger event_status_guard before insert or update on public.events
  for each row execute function public.event_status_guard();

alter table public.events enable row level security;
drop policy if exists "events: read" on public.events;
create policy "events: read" on public.events for select
  using (status in ('published', 'cancelled') or submitted_by = auth.uid() or public.is_moderator() or public.is_parish_team(parish_id));
drop policy if exists "events: submit" on public.events;
create policy "events: submit" on public.events for insert with check (auth.uid() = submitted_by);
drop policy if exists "events: edit" on public.events;
create policy "events: edit" on public.events for update
  using (submitted_by = auth.uid() or public.is_moderator() or public.is_parish_team(parish_id));

-- ─────────────────────────────────────────────────────────────
-- Donations / giving
-- Payments are taken by the payment provider (Paystack); the app records the intent and
-- the verify-payment Edge Function marks it paid after checking with the provider.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  parish_id uuid references public.parishes (id) on delete set null,
  purpose text not null check (purpose in ('tithe', 'offering', 'thanksgiving', 'building', 'harvest', 'welfare', 'mission', 'pledge', 'other')),
  amount_minor bigint not null check (amount_minor > 0),   -- kobo / cents
  currency text not null default 'NGN',
  donor_name text,
  donor_email text,
  is_anonymous boolean not null default false,
  note text check (char_length(note) <= 500),
  provider text not null default 'paystack',
  provider_reference text unique,
  status text not null default 'initiated' check (status in ('initiated', 'paid', 'failed', 'pledged', 'fulfilled', 'cancelled')),
  pledge_due date,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists donations_user_idx on public.donations (user_id, created_at desc);
alter table public.donations enable row level security;
drop policy if exists "donations: own or parish admin" on public.donations;
create policy "donations: own or parish admin" on public.donations for select
  using (auth.uid() = user_id or public.has_parish_role(parish_id, array['parochial_committee']) or public.is_admin());
drop policy if exists "donations: create own" on public.donations;
create policy "donations: create own" on public.donations for insert
  with check ((auth.uid() = user_id or user_id is null) and status in ('initiated', 'pledged'));
drop policy if exists "donations: cancel own pledge" on public.donations;
create policy "donations: cancel own pledge" on public.donations for update
  using (auth.uid() = user_id and status = 'pledged') with check (status in ('pledged', 'cancelled', 'initiated'));

-- ─────────────────────────────────────────────────────────────
-- Push notifications (Web Push subscriptions)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid references auth.users (id) on delete cascade,
  device_id text,
  keys jsonb not null,
  timezone text not null default 'Africa/Lagos',
  preferences jsonb not null default '{"serviceReminders":true,"devotionReminder":true,"devotionHour":7}',
  parish_id uuid references public.parishes (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
-- Subscriptions are written through the push-subscribe Edge Function only (service role)
drop policy if exists "push: own read" on public.push_subscriptions;
create policy "push: own read" on public.push_subscriptions for select using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- Hymn translations (Egun, French…) contributed and reviewed
-- ─────────────────────────────────────────────────────────────
create table if not exists public.hymn_translations (
  id uuid primary key default gen_random_uuid(),
  hymn_number integer not null,
  language text not null check (language in ('egun', 'fr')),
  title text,
  stanzas jsonb not null,                    -- [{"kind":"verse","number":1,"lines":["…"]}]
  source text,                               -- where the text comes from / permission
  contributor_id uuid references auth.users (id) on delete set null,
  status text not null default 'submitted' check (status in ('submitted', 'published', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- One published translation per hymn and language; any number of submissions can wait for review
create unique index if not exists hymn_translations_published_idx
  on public.hymn_translations (hymn_number, language) where status = 'published';
alter table public.hymn_translations enable row level security;
drop policy if exists "translations: read" on public.hymn_translations;
create policy "translations: read" on public.hymn_translations for select
  using (status = 'published' or contributor_id = auth.uid() or public.is_moderator());
drop policy if exists "translations: contribute" on public.hymn_translations;
create policy "translations: contribute" on public.hymn_translations for insert
  with check (auth.uid() = contributor_id and status = 'submitted');
drop policy if exists "translations: moderate" on public.hymn_translations;
create policy "translations: moderate" on public.hymn_translations for update using (public.is_moderator());

-- ─────────────────────────────────────────────────────────────
-- Reports (anyone can flag content or a text error for moderators)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users (id) on delete set null,
  target_kind text not null check (target_kind in ('article', 'comment', 'prayer_request', 'event', 'parish', 'hymn', 'bible', 'quiz')),
  target_id text not null,
  reason text not null check (char_length(reason) between 3 and 1000),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);
alter table public.content_reports enable row level security;
drop policy if exists "reports: create" on public.content_reports;
create policy "reports: create" on public.content_reports for insert
  with check (reporter_id is null or reporter_id = auth.uid());
drop policy if exists "reports: moderators" on public.content_reports;
create policy "reports: moderators" on public.content_reports for select using (public.is_moderator());
drop policy if exists "reports: resolve" on public.content_reports;
create policy "reports: resolve" on public.content_reports for update using (public.is_moderator());

-- ─────────────────────────────────────────────────────────────
-- Analytics: allow only small, well-formed anonymous events
-- ─────────────────────────────────────────────────────────────
create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  device_id text,
  event text not null,
  properties jsonb,
  platform text,
  created_at timestamptz not null default now()
);
alter table public.analytics_events enable row level security;
drop policy if exists "analytics: insert only" on public.analytics_events;
create policy "analytics: insert only" on public.analytics_events for insert with check (
  char_length(event) <= 40
  and char_length(coalesce(device_id, '')) <= 64
  and pg_column_size(properties) <= 2048
);
-- No select policy: analytics are read with the service role in the dashboard only.

-- ─────────────────────────────────────────────────────────────
-- Appointments with a parish's shepherd or administrators
-- ─────────────────────────────────────────────────────────────
-- Weekly availability that a shepherd/admin publishes, e.g. Tuesdays 16:00–18:00
create table if not exists public.appointment_slots (
  id uuid primary key default gen_random_uuid(),
  parish_id uuid not null references public.parishes (id) on delete cascade,
  host_id uuid not null references auth.users (id) on delete cascade,
  host_name text not null,
  host_role text not null default 'shepherd' check (host_role in ('shepherd', 'admin', 'editor')),
  weekday smallint not null check (weekday between 0 and 6),   -- 0 = Sunday
  start_time time not null,
  end_time time not null check (end_time > start_time),
  minutes_per_meeting smallint not null default 30 check (minutes_per_meeting between 10 and 180),
  location text,                                -- e.g. "Vestry" or a call link
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.appointment_slots enable row level security;
drop policy if exists "slots: read" on public.appointment_slots;
create policy "slots: read" on public.appointment_slots for select using (active or public.is_parish_admin(parish_id));
drop policy if exists "slots: manage own" on public.appointment_slots;
create policy "slots: manage own" on public.appointment_slots for all
  using (host_id = auth.uid() and public.is_parish_admin(parish_id))
  with check (host_id = auth.uid() and public.is_parish_admin(parish_id));

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  parish_id uuid not null references public.parishes (id) on delete cascade,
  host_id uuid not null references auth.users (id) on delete cascade,
  member_id uuid not null references auth.users (id) on delete cascade,
  member_name text not null,
  member_phone text,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  topic text not null check (char_length(topic) between 3 and 140),   -- e.g. counselling, marriage, child dedication
  details text check (char_length(details) <= 1000),
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'declined', 'cancelled', 'done')),
  host_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (host_id, starts_at)                    -- one booking per host per time
);
create index if not exists appointments_host_idx on public.appointments (host_id, starts_at);
alter table public.appointments enable row level security;
drop policy if exists "appointments: parties" on public.appointments;
create policy "appointments: parties" on public.appointments for select
  using (member_id = auth.uid() or host_id = auth.uid() or public.is_parish_admin(parish_id));
drop policy if exists "appointments: book" on public.appointments;
create policy "appointments: book" on public.appointments for insert
  with check (member_id = auth.uid() and status = 'requested');
drop policy if exists "appointments: update by parties" on public.appointments;
create policy "appointments: update by parties" on public.appointments for update
  using (member_id = auth.uid() or host_id = auth.uid() or public.is_parish_admin(parish_id));

-- Members may only cancel; hosts confirm, decline or complete
create or replace function public.appointment_status_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() = old.member_id and not public.is_parish_admin(old.parish_id) and auth.uid() <> old.host_id then
    if new.status not in ('requested', 'cancelled') then new.status := old.status; end if;
    new.host_note := old.host_note;
    new.starts_at := old.starts_at;
    new.ends_at := old.ends_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists appointment_status_guard on public.appointments;
create trigger appointment_status_guard before update on public.appointments
  for each row execute function public.appointment_status_guard();

-- Busy times for a host, without revealing who booked them
create or replace function public.host_busy_times(p_host uuid, p_from timestamptz, p_to timestamptz)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.starts_at, a.ends_at from public.appointments a
  where a.host_id = p_host and a.status in ('requested', 'confirmed')
    and a.starts_at < p_to and a.ends_at > p_from;
$$;
grant execute on function public.host_busy_times(uuid, timestamptz, timestamptz) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Parish self-service: links, and managing their own administrators
-- ─────────────────────────────────────────────────────────────
alter table public.parishes add column if not exists map_url text;
alter table public.parishes add column if not exists social_links jsonb;      -- {"facebook": "...", "youtube": "...", "whatsapp": "..."}
alter table public.parishes add column if not exists accepts_prayer_requests boolean not null default true;
alter table public.parishes add column if not exists accepts_appointments boolean not null default false;

create or replace view public.parish_directory with (security_invoker = true) as
  select id, name, diocese, province, country, state_region, city, address, latitude, longitude, shepherd_name,
         case when contact_public then phone end as phone,
         case when contact_public then email end as email,
         website, map_url, social_links, service_times, giving_details,
         accepts_prayer_requests, accepts_appointments, kind, live_url, live_title, live_now, live_updated_at, updated_at
  from public.parishes where status = 'published';

-- A verified admin of a parish can add or remove that parish's other administrators
drop policy if exists "parish_admins: managed by parish" on public.parish_admins;
create policy "parish_admins: managed by parish" on public.parish_admins for all
  using (public.is_parish_admin(parish_id))
  with check (public.is_parish_admin(parish_id));

-- Members of a parish (for parish admins to see who belongs, without private fields)
create or replace view public.parish_members as
  select p.id, p.display_name, p.church_title, p.member_type, p.ministry, p.parish_id
  from public.profiles p
  where public.is_parish_team(p.parish_id);
grant select on public.parish_members to authenticated;

-- Parish admins add colleagues by email; only returns an id, never the email list
create or replace function public.find_user_by_email(p_email text)
returns uuid language sql stable security definer set search_path = public, auth as $$
  select u.id from auth.users u
  where lower(u.email) = lower(p_email)
    and exists (select 1 from public.parish_admins pa where pa.user_id = auth.uid() and pa.verified)
  limit 1;
$$;
revoke all on function public.find_user_by_email(text) from public, anon;
grant execute on function public.find_user_by_email(text) to authenticated;

-- Going live: parish/ministry admins flip live_now; the timestamp lets the app hide stale "live" flags
create or replace function public.touch_live()
returns trigger language plpgsql as $$
begin
  if new.live_now is distinct from old.live_now or new.live_url is distinct from old.live_url then
    new.live_updated_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists touch_live on public.parishes;
create trigger touch_live before update on public.parishes for each row execute function public.touch_live();

-- An independent shepherd who registers a ministry becomes its (unverified) administrator automatically
create or replace function public.claim_new_ministry()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.submitted_by is not null then
    insert into public.parish_admins (parish_id, user_id, role, verified)
    values (new.id, new.submitted_by, case when new.kind = 'ministry' then 'shepherd' else 'admin' end, false)
    on conflict do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists claim_new_ministry on public.parishes;
create trigger claim_new_ministry after insert on public.parishes for each row execute function public.claim_new_ministry();

-- Publishing a parish/ministry verifies the person who registered it as its administrator
create or replace function public.verify_submitter_on_publish()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'published' and old.status <> 'published' and new.submitted_by is not null then
    update public.parish_admins set verified = true where parish_id = new.id and user_id = new.submitted_by;
  end if;
  return new;
end;
$$;
drop trigger if exists verify_submitter_on_publish on public.parishes;
create trigger verify_submitter_on_publish after update on public.parishes for each row execute function public.verify_submitter_on_publish();

-- Parish teams publish or keep private their parish's prayer requests
drop policy if exists "prayer: parish team moderates" on public.prayer_requests;
create policy "prayer: parish team moderates" on public.prayer_requests for update
  using (parish_id is not null and public.has_parish_role(parish_id, array['parochial_committee']));

-- Media and choir members may only change the livestream fields of their parish
create or replace function public.restrict_parish_columns()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  live_url text := new.live_url; live_title text := new.live_title; live_now boolean := new.live_now;
begin
  if public.is_parish_admin(old.id) or (old.submitted_by = auth.uid() and old.status = 'pending') then
    return new;
  end if;
  new := old;
  new.live_url := live_url; new.live_title := live_title; new.live_now := live_now;
  if new.live_now is distinct from old.live_now or new.live_url is distinct from old.live_url then
    new.live_updated_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists restrict_parish_columns on public.parishes;
create trigger restrict_parish_columns before update on public.parishes
  for each row execute function public.restrict_parish_columns();

-- ─────────────────────────────────────────────────────────────
-- Payout accounts: every gift is paid through the platform's gateway (Paystack) and
-- settled to the parish's bank account through a Paystack subaccount (split payment).
-- Bank details are private: parish shepherds/admins and platform admins only.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.payout_accounts (
  parish_id uuid primary key references public.parishes (id) on delete cascade,
  bank_name text not null,
  bank_code text not null,                    -- Paystack bank code (from the bank list)
  account_number text not null check (account_number ~ '^[0-9]{10}$'),
  account_name text,                          -- confirmed name returned by the bank
  currency text not null default 'NGN',
  subaccount_code text,                       -- ACCT_xxx, set by the payout-account Edge Function
  status text not null default 'pending' check (status in ('pending', 'verified', 'failed')),
  status_message text,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);
alter table public.payout_accounts enable row level security;
drop policy if exists "payout: parish admins read" on public.payout_accounts;
create policy "payout: parish admins read" on public.payout_accounts for select
  using (public.is_parish_admin(parish_id) or public.is_admin());
-- Writes go through the payout-account Edge Function (service role), which checks the
-- caller is a parish admin and verifies the account with the bank before saving.

-- Whether a parish can receive gifts (without exposing bank details)
create or replace function public.parish_can_receive(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.payout_accounts where parish_id = pid and status = 'verified' and subaccount_code is not null);
$$;
grant execute on function public.parish_can_receive(uuid) to anon, authenticated;

-- Reminders already sent, so the scheduler never sends the same one twice
create table if not exists public.push_log (
  endpoint text not null references public.push_subscriptions (endpoint) on delete cascade,
  key text not null,                         -- e.g. 'lords_day_service-30-2026-06-14'
  sent_at timestamptz not null default now(),
  primary key (endpoint, key)
);
alter table public.push_log enable row level security;  -- service role only

-- Run the reminder sender every five minutes (needs the pg_cron and pg_net extensions):
--   select cron.schedule('send-reminders', '*/5 * * * *', $$
--     select net.http_post(url := 'https://<project>.supabase.co/functions/v1/send-reminders',
--                          headers := '{"Authorization": "Bearer <CRON_SECRET>"}'::jsonb)
--   $$);
