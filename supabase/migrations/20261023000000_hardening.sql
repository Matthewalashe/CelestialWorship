-- Hardening (docs/PRINCIPLES.md §2–3): the server decides status, names and which links are allowed.
-- Runs after 20261022000000_community.sql.

-- ─────────────────────────────────────────────────────────────
-- Names on shared content come from the author's profile, never from the client
-- ─────────────────────────────────────────────────────────────
create or replace function public.profile_name(uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select nullif(trim(concat_ws(' ', p.church_title, p.display_name)), '') from public.profiles p where p.id = uid),
    'Member');
$$;

create or replace function public.set_author_name()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    -- Names are fixed at posting time
    if tg_table_name in ('articles', 'article_comments') then new.author_name := old.author_name; end if;
    if tg_table_name = 'prayer_requests' then
      new.display_name := case when new.is_anonymous then null else coalesce(old.display_name, public.profile_name(old.user_id)) end;
    end if;
    if tg_table_name = 'appointments' then new.member_name := old.member_name; end if;
    return new;
  end if;
  if tg_table_name = 'articles' then new.author_name := public.profile_name(new.author_id);
  elsif tg_table_name = 'article_comments' then new.author_name := public.profile_name(new.user_id);
  elsif tg_table_name = 'prayer_requests' then
    new.display_name := case when new.is_anonymous then null else public.profile_name(new.user_id) end;
  elsif tg_table_name = 'appointments' then new.member_name := public.profile_name(new.member_id);
  end if;
  return new;
end;
$$;

drop trigger if exists set_author_name on public.articles;
create trigger set_author_name before insert or update on public.articles
  for each row execute function public.set_author_name();
drop trigger if exists set_author_name on public.article_comments;
create trigger set_author_name before insert or update on public.article_comments
  for each row execute function public.set_author_name();
drop trigger if exists set_author_name on public.prayer_requests;
create trigger set_author_name before insert or update on public.prayer_requests
  for each row execute function public.set_author_name();
drop trigger if exists set_author_name on public.appointments;
create trigger set_author_name before insert or update on public.appointments
  for each row execute function public.set_author_name();

-- ─────────────────────────────────────────────────────────────
-- Prayer requests: only reviewers publish
--   owner         may mark a published request answered and add a testimony; editing the words
--                 sends it back for review; may never publish or unhide it
--   parish team   (parochial committee, shepherd, admin) may only publish, hide or return it
--   moderators    anything
-- ─────────────────────────────────────────────────────────────
create or replace function public.prayer_request_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  decided text := new.status;
begin
  if public.is_moderator() then
    new.updated_at := now();
    return new;
  end if;

  if auth.uid() = old.user_id then
    new.user_id := old.user_id;
    new.parish_id := old.parish_id;
    new.prayer_count := old.prayer_count;
    new.created_at := old.created_at;
    if new.status is distinct from old.status
       and not (new.status = 'answered' and old.status in ('published', 'answered')) then
      new.status := old.status;
    end if;
    if new.title is distinct from old.title or new.body is distinct from old.body
       or new.visibility is distinct from old.visibility then
      new.status := 'pending';
    end if;
  elsif old.parish_id is not null and public.has_parish_role(old.parish_id, array['parochial_committee']) then
    -- The team records a review decision; the member's words stay theirs
    new := old;
    if decided in ('pending', 'published', 'hidden') then new.status := decided; end if;
  else
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists prayer_request_guard on public.prayer_requests;
create trigger prayer_request_guard before update on public.prayer_requests
  for each row execute function public.prayer_request_guard();

-- ─────────────────────────────────────────────────────────────
-- Parishes: only moderators change the listing status or owner
-- (replaces the version in the community migration)
-- ─────────────────────────────────────────────────────────────
create or replace function public.restrict_parish_columns()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  live_url text := new.live_url; live_title text := new.live_title; live_now boolean := new.live_now;
begin
  if public.is_moderator() then
    return new;
  end if;
  if public.is_parish_admin(old.id) or (old.submitted_by = auth.uid() and old.status = 'pending') then
    -- Details yes; publishing, hiding and ownership are the moderators' decision
    new.status := old.status;
    new.submitted_by := old.submitted_by;
    new.id := old.id;
    return new;
  end if;
  -- Media and choir: livestream fields only
  new := old;
  new.live_url := live_url; new.live_title := live_title; new.live_now := live_now;
  if new.live_now is distinct from old.live_now or new.live_url is distinct from old.live_url then
    new.live_updated_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Adding colleagues by email: full parish admins only, for an exact address
-- ─────────────────────────────────────────────────────────────
create or replace function public.find_user_by_email(p_email text)
returns uuid language sql stable security definer set search_path = public, auth as $$
  select u.id from auth.users u
  where lower(u.email) = lower(trim(p_email))
    and exists (select 1 from public.parish_admins pa
                where pa.user_id = auth.uid() and pa.verified and pa.role in ('shepherd', 'admin'))
  limit 1;
$$;
revoke all on function public.find_user_by_email(text) from public, anon;
grant execute on function public.find_user_by_email(text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Links people can tap must be https (no javascript:, data: or plain http)
-- ─────────────────────────────────────────────────────────────
create or replace function public.is_https_url(u text)
returns boolean language sql immutable as $$
  select u is null or u = '' or (u ~* '^https://[^\s/$.?#][^\s]*$' and char_length(u) <= 2048);
$$;

create or replace function public.links_are_https(links jsonb)
returns boolean language sql immutable as $$
  select links is null or jsonb_typeof(links) <> 'object'
      or not exists (select 1 from jsonb_each_text(links) e where not public.is_https_url(e.value));
$$;

alter table public.parishes drop constraint if exists parishes_https_links;
alter table public.parishes add constraint parishes_https_links check (
  public.is_https_url(website) and public.is_https_url(live_url) and public.is_https_url(map_url)
  and public.links_are_https(social_links)
);
alter table public.events drop constraint if exists events_https_image;
alter table public.events add constraint events_https_image check (public.is_https_url(image_url));
