-- Parish space: a private workspace for each parish (channels and posts, like a small Slack), and
-- rosters for who ministers at each service (service conductor, lesson readers, preacher …).
--
-- People in the space are rows of parish_admins. Two new roles join the existing team roles:
--   minister  — church workers who minister at services (conductors, readers, incense bearers …)
--   member    — laity the parish adds to its space
-- They can read and post in the space and see rosters; they gain no administration rights.

-- ── Roles ──────────────────────────────────────────────────────────────────────

alter table public.parish_admins drop constraint if exists parish_admins_role_check;
alter table public.parish_admins add constraint parish_admins_role_check
  check (role in ('shepherd', 'admin', 'parochial_committee', 'media', 'choir', 'editor', 'minister', 'member'));

-- "Team" keeps meaning those who run the parish page (publishing events, media, plans)
create or replace function public.is_parish_team(pid uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.parish_admins where parish_id = pid and user_id = uid and verified and role not in ('minister', 'member'))
      or public.is_moderator(uid);
$$;

-- Anyone the parish has added to its space
create or replace function public.is_parish_space(pid uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.parish_admins where parish_id = pid and user_id = uid and verified)
      or public.is_moderator(uid);
$$;
grant execute on function public.is_parish_space(uuid, uuid) to authenticated;

-- Those who may plan rosters and manage channels: shepherds, admins, the parochial committee and editors
create or replace function public.can_plan_parish(pid uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_parish_role(pid, array['parochial_committee', 'editor'], uid);
$$;

-- The spaces a member belongs to, with the parish name
create or replace view public.my_parish_spaces with (security_invoker = true) as
  select a.parish_id, a.role, p.name, p.city, p.logo_url
  from public.parish_admins a join public.parishes p on p.id = a.parish_id
  where a.user_id = auth.uid() and a.verified;
grant select on public.my_parish_spaces to authenticated;

-- People in a space, for the member list and for choosing who a post or duty is for
create or replace function public.parish_space_people(pid uuid)
returns table (user_id uuid, role text, display_name text, church_title text, avatar_url text)
language sql stable security definer set search_path = public as $$
  select a.user_id, a.role, p.display_name, p.church_title, p.avatar_url
  from public.parish_admins a join public.profiles p on p.id = a.user_id
  where a.parish_id = pid and a.verified and public.is_parish_space(pid)
  order by p.display_name;
$$;
grant execute on function public.parish_space_people(uuid) to authenticated;

-- ── Channels ───────────────────────────────────────────────────────────────────

create table if not exists public.parish_channels (
  id uuid primary key default gen_random_uuid(),
  parish_id uuid not null references public.parishes (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  about text check (char_length(about) <= 200),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (parish_id, name)
);
alter table public.parish_channels enable row level security;
drop policy if exists "channels: space reads" on public.parish_channels;
create policy "channels: space reads" on public.parish_channels for select using (public.is_parish_space(parish_id));
drop policy if exists "channels: planners manage" on public.parish_channels;
create policy "channels: planners manage" on public.parish_channels for all
  using (public.can_plan_parish(parish_id)) with check (public.can_plan_parish(parish_id));

-- Every space starts with a General channel
create or replace function public.ensure_general_channel(pid uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if not public.is_parish_space(pid) then raise exception 'Not in this parish space' using errcode = '42501'; end if;
  select id into cid from public.parish_channels where parish_id = pid and name = 'General';
  if cid is null then
    insert into public.parish_channels (parish_id, name, about) values (pid, 'General', 'Everyone in the parish space')
    returning id into cid;
  end if;
  return cid;
end;
$$;
grant execute on function public.ensure_general_channel(uuid) to authenticated;

-- ── Posts ──────────────────────────────────────────────────────────────────────

create table if not exists public.parish_posts (
  id uuid primary key default gen_random_uuid(),
  parish_id uuid not null references public.parishes (id) on delete cascade,
  channel_id uuid references public.parish_channels (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  -- space: everyone in the parish space · people: only those chosen · link: anyone with the link
  audience text not null default 'space' check (audience in ('space', 'people', 'link')),
  share_token text unique,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index if not exists parish_posts_feed_idx on public.parish_posts (parish_id, channel_id, created_at desc);

create table if not exists public.parish_post_people (
  post_id uuid not null references public.parish_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (post_id, user_id)
);

alter table public.parish_posts enable row level security;
alter table public.parish_post_people enable row level security;

-- Checks across the two tables go through these functions, so neither policy reads the other table's
-- policy (which Postgres would reject as recursion)
create or replace function public.post_is_for_me(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.parish_post_people where post_id = pid and user_id = auth.uid());
$$;
create or replace function public.post_is_mine_or_admin(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.parish_posts p where p.id = pid and (p.author_id = auth.uid() or public.is_parish_admin(p.parish_id)));
$$;
create or replace function public.post_is_mine(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.parish_posts p where p.id = pid and p.author_id = auth.uid());
$$;

drop policy if exists "posts: read" on public.parish_posts;
create policy "posts: read" on public.parish_posts for select using (
  author_id = auth.uid()
  or (audience in ('space', 'link') and public.is_parish_space(parish_id))
  or public.post_is_for_me(id)
  or public.is_parish_admin(parish_id)
);
drop policy if exists "posts: write own in a space" on public.parish_posts;
create policy "posts: write own in a space" on public.parish_posts for insert with check (
  author_id = auth.uid() and public.is_parish_space(parish_id)
  and (channel_id is null or exists (select 1 from public.parish_channels c where c.id = channel_id and c.parish_id = parish_id))
);
drop policy if exists "posts: edit own" on public.parish_posts;
create policy "posts: edit own" on public.parish_posts for update using (author_id = auth.uid()) with check (author_id = auth.uid());
drop policy if exists "posts: delete own or admin" on public.parish_posts;
create policy "posts: delete own or admin" on public.parish_posts for delete using (author_id = auth.uid() or public.is_parish_admin(parish_id));

drop policy if exists "post people: read" on public.parish_post_people;
create policy "post people: read" on public.parish_post_people for select using (
  user_id = auth.uid() or public.post_is_mine_or_admin(post_id)
);
drop policy if exists "post people: author adds" on public.parish_post_people;
create policy "post people: author adds" on public.parish_post_people for insert with check (
  public.post_is_mine(post_id)
);

-- A link to share is made when the post is for "anyone with the link"
create or replace function public.parish_post_token()
returns trigger language plpgsql as $$
begin
  if new.audience = 'link' and new.share_token is null then
    new.share_token := replace(gen_random_uuid()::text, '-', '');
  elsif new.audience <> 'link' then
    new.share_token := null;
  end if;
  return new;
end;
$$;
drop trigger if exists parish_post_token on public.parish_posts;
create trigger parish_post_token before insert or update on public.parish_posts for each row execute function public.parish_post_token();
drop trigger if exists rate_limit on public.parish_posts;
create trigger rate_limit before insert on public.parish_posts for each row execute function public.rate_limit('author_id', '60');

-- The posts a member can see, with the author's name (one query for the feed)
create or replace view public.parish_feed with (security_invoker = true) as
  select p.id, p.parish_id, p.channel_id, p.author_id, p.body, p.audience, p.share_token, p.created_at, p.edited_at,
         pr.display_name as author_name, pr.church_title as author_title, pr.avatar_url as author_avatar
  from public.parish_posts p left join public.public_profiles pr on pr.id = p.author_id;
grant select on public.parish_feed to authenticated;

-- A post shared by link, readable by anyone who has the link
create or replace function public.shared_parish_post(token text)
returns table (body text, created_at timestamptz, author_name text, author_title text, parish_name text, parish_id uuid)
language sql stable security definer set search_path = public as $$
  select p.body, p.created_at, pr.display_name, pr.church_title, pa.name, pa.id
  from public.parish_posts p
  join public.parishes pa on pa.id = p.parish_id
  left join public.profiles pr on pr.id = p.author_id
  where p.audience = 'link' and p.share_token = token;
$$;
grant execute on function public.shared_parish_post(text) to anon, authenticated;

-- ── Rosters ────────────────────────────────────────────────────────────────────

create table if not exists public.parish_rosters (
  id uuid primary key default gen_random_uuid(),
  parish_id uuid not null references public.parishes (id) on delete cascade,
  service_date date not null,
  service_id text,
  title text not null check (char_length(title) between 1 and 120),
  notes text check (char_length(notes) <= 1000),
  status text not null default 'draft' check (status in ('draft', 'published')),
  share_token text unique default replace(gen_random_uuid()::text, '-', ''),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists parish_rosters_date_idx on public.parish_rosters (parish_id, service_date);

create table if not exists public.parish_roster_duties (
  id uuid primary key default gen_random_uuid(),
  roster_id uuid not null references public.parish_rosters (id) on delete cascade,
  position integer not null default 0,
  duty text not null check (char_length(duty) between 1 and 80),
  -- someone in the app, or just a name for someone who is not
  user_id uuid references auth.users (id) on delete set null,
  person_name text check (char_length(person_name) <= 80),
  status text not null default 'assigned' check (status in ('assigned', 'accepted', 'declined')),
  response_note text check (char_length(response_note) <= 300)
);
create index if not exists parish_roster_duties_user_idx on public.parish_roster_duties (user_id);

alter table public.parish_rosters enable row level security;
alter table public.parish_roster_duties enable row level security;

create or replace function public.roster_has_my_duty(rid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.parish_roster_duties where roster_id = rid and user_id = auth.uid());
$$;
create or replace function public.roster_visible(rid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.parish_rosters r where r.id = rid and
    ((r.status = 'published' and public.is_parish_space(r.parish_id)) or public.can_plan_parish(r.parish_id)));
$$;
create or replace function public.roster_planner(rid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.parish_rosters r where r.id = rid and public.can_plan_parish(r.parish_id));
$$;

drop policy if exists "rosters: read" on public.parish_rosters;
create policy "rosters: read" on public.parish_rosters for select using (
  (status = 'published' and public.is_parish_space(parish_id)) or public.can_plan_parish(parish_id)
  or public.roster_has_my_duty(id)
);
drop policy if exists "rosters: planners manage" on public.parish_rosters;
create policy "rosters: planners manage" on public.parish_rosters for all
  using (public.can_plan_parish(parish_id)) with check (public.can_plan_parish(parish_id));

drop policy if exists "duties: read" on public.parish_roster_duties;
create policy "duties: read" on public.parish_roster_duties for select using (
  user_id = auth.uid() or public.roster_visible(roster_id)
);
drop policy if exists "duties: planners manage" on public.parish_roster_duties;
create policy "duties: planners manage" on public.parish_roster_duties for all
  using (public.roster_planner(roster_id)) with check (public.roster_planner(roster_id));

-- The person on a duty answers it (and can change nothing else)
create or replace function public.respond_to_duty(duty_id uuid, answer text, note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if answer not in ('accepted', 'declined') then raise exception 'Answer accepted or declined' using errcode = '22023'; end if;
  update public.parish_roster_duties set status = answer, response_note = left(note, 300)
  where id = duty_id and user_id = auth.uid();
  if not found then raise exception 'This duty is not yours' using errcode = '42501'; end if;
end;
$$;
grant execute on function public.respond_to_duty(uuid, text, text) to authenticated;

-- My duties to come, across parishes
create or replace view public.my_duties with (security_invoker = true) as
  select d.id, d.duty, d.status, r.id as roster_id, r.service_date, r.service_id, r.title, r.parish_id, p.name as parish_name
  from public.parish_roster_duties d
  join public.parish_rosters r on r.id = d.roster_id
  join public.parishes p on p.id = r.parish_id
  where d.user_id = auth.uid() and r.status = 'published' and r.service_date >= current_date;
grant select on public.my_duties to authenticated;

-- A published roster shared by link: readable by those it is sent to, inside or outside the app
create or replace function public.shared_roster(token text)
returns table (title text, service_date date, service_id text, notes text, parish_name text, duty text, person text, status text, seq integer)
language sql stable security definer set search_path = public as $$
  select r.title, r.service_date, r.service_id, r.notes, p.name, d.duty,
         coalesce(nullif(trim(concat_ws(' ', pr.church_title, pr.display_name)), ''), d.person_name), d.status, d.position
  from public.parish_rosters r
  join public.parishes p on p.id = r.parish_id
  left join public.parish_roster_duties d on d.roster_id = r.id
  left join public.profiles pr on pr.id = d.user_id
  where r.share_token = token and r.status = 'published'
  order by d.position;
$$;
grant execute on function public.shared_roster(text) to anon, authenticated;

drop trigger if exists rate_limit on public.parish_rosters;
create trigger rate_limit before insert on public.parish_rosters for each row execute function public.rate_limit('created_by', '30');
