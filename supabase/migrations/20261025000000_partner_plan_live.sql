-- Partner plan, livestreams and support for shepherds' writing.
--
-- Parishes and ministries (including independent shepherds) on the paid Partner plan can:
--   • take gifts (tithes, offerings, …) through the platform's gateway
--   • receive support on their shepherds' articles and commentaries
--   • livestream (go live, schedule broadcasts, alert their members and followers)
-- Reading, worship and prayer stay free for everyone. The database enforces the plan;
-- the app only explains it.

-- ─────────────────────────────────────────────────────────────
-- Plans and subscriptions (Paystack subscriptions; see the subscribe and paystack-webhook functions)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.plans (
  id text primary key,                         -- 'partner_monthly', 'partner_yearly'
  name text not null,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null default 'NGN',
  interval text not null check (interval in ('monthly', 'annually')),
  paystack_plan_code text,                     -- PLN_xxx, created in the Paystack dashboard
  active boolean not null default true
);
alter table public.plans enable row level security;
drop policy if exists "plans: read" on public.plans;
create policy "plans: read" on public.plans for select using (active);
-- Prices are set by the platform (placeholders; change them before launch)
insert into public.plans (id, name, amount_minor, currency, interval) values
  ('partner_monthly', 'Partner — monthly', 500000, 'NGN', 'monthly'),
  ('partner_yearly', 'Partner — yearly', 5000000, 'NGN', 'annually')
on conflict (id) do nothing;

create table if not exists public.parish_subscriptions (
  parish_id uuid primary key references public.parishes (id) on delete cascade,
  plan_id text not null references public.plans (id),
  status text not null check (status in ('active', 'non_renewing', 'past_due', 'cancelled')),
  current_period_end timestamptz,
  paystack_subscription_code text unique,
  paystack_customer_code text,
  paystack_email_token text,
  started_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);
alter table public.parish_subscriptions enable row level security;
drop policy if exists "subscriptions: parish team" on public.parish_subscriptions;
create policy "subscriptions: parish team" on public.parish_subscriptions for select
  using (public.is_parish_team(parish_id) or public.is_admin());
-- Writes only by the service role (webhook)

-- A parish or ministry on the Partner plan (a few days' grace when a renewal fails)
create or replace function public.parish_has_plan(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.parish_subscriptions s
    where s.parish_id = pid
      and (
        (s.status in ('active', 'non_renewing') and (s.current_period_end is null or s.current_period_end > now()))
        or (s.status = 'past_due' and s.current_period_end > now() - interval '5 days')
      )
  );
$$;
grant execute on function public.parish_has_plan(uuid) to anon, authenticated;

-- Can take gifts: on the plan and with a verified payout account
create or replace function public.parish_can_receive(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.parish_has_plan(pid)
     and exists (select 1 from public.payout_accounts where parish_id = pid and status = 'verified' and subaccount_code is not null);
$$;
grant execute on function public.parish_can_receive(uuid) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Gifts: only to parishes that can receive; support for an article or a broadcast
-- ─────────────────────────────────────────────────────────────
alter table public.donations drop constraint if exists donations_purpose_check;
alter table public.donations add constraint donations_purpose_check
  check (purpose in ('tithe', 'offering', 'thanksgiving', 'building', 'harvest', 'welfare', 'mission', 'pledge', 'support', 'other'));
alter table public.donations add column if not exists source_kind text check (source_kind in ('article', 'livestream'));
alter table public.donations add column if not exists source_id uuid;

drop policy if exists "donations: create own" on public.donations;
create policy "donations: create own" on public.donations for insert
  with check ((auth.uid() = user_id or user_id is null) and status in ('initiated', 'pledged')
              and (parish_id is null or public.parish_can_receive(parish_id)));

-- ─────────────────────────────────────────────────────────────
-- Articles: the shepherd's parish or ministry that receives support
-- ─────────────────────────────────────────────────────────────
alter table public.articles add column if not exists support_parish_id uuid references public.parishes (id) on delete set null;

create or replace function public.article_support_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Only a page the author leads as shepherd or admin
  if new.support_parish_id is not null
     and not exists (select 1 from public.parish_admins pa
                     where pa.parish_id = new.support_parish_id and pa.user_id = new.author_id
                       and pa.verified and pa.role in ('shepherd', 'admin')) then
    new.support_parish_id := null;
  end if;
  return new;
end;
$$;
drop trigger if exists article_support_guard on public.articles;
create trigger article_support_guard before insert or update on public.articles
  for each row execute function public.article_support_guard();

-- ─────────────────────────────────────────────────────────────
-- Livestreaming
-- ─────────────────────────────────────────────────────────────
-- Where a parish streams. A YouTube channel id lets the app show whatever is live on the channel
-- without anyone pasting a link each week.
alter table public.parishes add column if not exists live_channels jsonb not null default '{}';
  -- {"youtube_channel_id":"UC…","youtube":"https://…","facebook":"https://…","instagram":"…","tiktok":"…","x":"…","mixlr":"…"}

alter table public.parishes drop constraint if exists parishes_https_live_channels;
alter table public.parishes add constraint parishes_https_live_channels check (
  public.links_are_https(live_channels - 'youtube_channel_id')
  and coalesce(live_channels ->> 'youtube_channel_id', 'UC0000000000000000000000') ~ '^UC[\w-]{22}$'
);

create table if not exists public.livestreams (
  id uuid primary key default gen_random_uuid(),
  parish_id uuid not null references public.parishes (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 140),
  description text check (char_length(description) <= 1000),
  scheduled_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'ended', 'cancelled')),
  -- Each platform it goes out on: [{"platform":"youtube","url":"https://youtube.com/live/…"}, …]
  destinations jsonb not null default '[]',
  started_at timestamptz,
  ended_at timestamptz,
  notified_at timestamptz,
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(destinations) = 'array' and jsonb_array_length(destinations) <= 8)
);
create index if not exists livestreams_parish_idx on public.livestreams (parish_id, coalesce(scheduled_at, created_at) desc);
create index if not exists livestreams_status_idx on public.livestreams (status, scheduled_at);
alter table public.livestreams enable row level security;

create or replace function public.destinations_are_https(d jsonb)
returns boolean language sql immutable as $$
  select not exists (select 1 from jsonb_array_elements(d) e
                     where not public.is_https_url(e ->> 'url')
                        or (e ->> 'platform') not in ('youtube', 'facebook', 'instagram', 'tiktok', 'x', 'mixlr', 'website', 'other'));
$$;
alter table public.livestreams drop constraint if exists livestreams_https_destinations;
alter table public.livestreams add constraint livestreams_https_destinations check (public.destinations_are_https(destinations));

drop policy if exists "livestreams: read" on public.livestreams;
create policy "livestreams: read" on public.livestreams for select
  using (status <> 'cancelled' or public.is_parish_team(parish_id));
drop policy if exists "livestreams: media team on the plan" on public.livestreams;
create policy "livestreams: media team on the plan" on public.livestreams for all
  using (public.has_parish_role(parish_id, array['media']))
  with check (public.has_parish_role(parish_id, array['media'])
              and (public.parish_has_plan(parish_id) or public.is_admin() or status in ('ended', 'cancelled')));

-- Going live and ending: keep the stream and the parish's "live now" flag in step
create or replace function public.livestream_status_sync()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  first_url text := new.destinations -> 0 ->> 'url';
begin
  new.updated_at := now();
  if new.status = 'live' and (tg_op = 'INSERT' or old.status <> 'live') then
    new.started_at := now();
    update public.parishes
       set live_now = true, live_url = coalesce(first_url, live_url), live_title = new.title, live_updated_at = now()
     where id = new.parish_id;
  elsif new.status in ('ended', 'cancelled') and tg_op = 'UPDATE' and old.status = 'live' then
    new.ended_at := now();
    update public.parishes set live_now = false, live_updated_at = now() where id = new.parish_id;
  end if;
  return new;
end;
$$;
drop trigger if exists livestream_status_sync on public.livestreams;
create trigger livestream_status_sync before insert or update on public.livestreams
  for each row execute function public.livestream_status_sync();

-- The parish's own "live now" switch also needs the plan
create or replace function public.live_requires_plan()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.live_now and not coalesce(old.live_now, false)
     and not public.parish_has_plan(new.id) and not public.is_admin() then
    raise exception 'Livestreaming is part of the Partner plan' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists live_requires_plan on public.parishes;
create trigger live_requires_plan before update on public.parishes
  for each row execute function public.live_requires_plan();

-- Media team may also change the channels (extends restrict_parish_columns)
create or replace function public.restrict_parish_columns()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  live_url text := new.live_url; live_title text := new.live_title; live_now boolean := new.live_now;
  channels jsonb := new.live_channels;
begin
  if public.is_moderator() then
    return new;
  end if;
  if public.is_parish_admin(old.id) or (old.submitted_by = auth.uid() and old.status = 'pending') then
    new.status := old.status;
    new.submitted_by := old.submitted_by;
    new.id := old.id;
    return new;
  end if;
  new := old;
  new.live_url := live_url; new.live_title := live_title; new.live_now := live_now; new.live_channels := channels;
  if new.live_now is distinct from old.live_now or new.live_url is distinct from old.live_url then
    new.live_updated_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- Show the channels in the public directory
create or replace view public.parish_directory with (security_invoker = true) as
  select id, name, diocese, province, country, state_region, city, address, latitude, longitude, shepherd_name,
         case when contact_public then phone end as phone,
         case when contact_public then email end as email,
         website, map_url, social_links, service_times, giving_details,
         accepts_prayer_requests, accepts_appointments, kind, live_url, live_title, live_now, live_updated_at,
         live_channels, public.parish_has_plan(id) as partner, updated_at
  from public.parishes where status = 'published';

-- ─────────────────────────────────────────────────────────────
-- Following a parish or ministry: live alerts and its broadcasts on your Live page
-- ─────────────────────────────────────────────────────────────
create table if not exists public.parish_follows (
  user_id uuid not null references auth.users (id) on delete cascade,
  parish_id uuid not null references public.parishes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, parish_id)
);
alter table public.parish_follows enable row level security;
drop policy if exists "follows: own" on public.parish_follows;
create policy "follows: own" on public.parish_follows for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.follower_count(pid uuid)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from public.parish_follows where parish_id = pid;
$$;
grant execute on function public.follower_count(uuid) to anon, authenticated;
