-- Joining parish spaces. A registered member can belong to any number of spaces:
--   · they ask to join and the parish admits them, or
--   · the parish invites them with a link (anyone, or one email) and they accept.
-- Someone without an account opens the link, signs up, and then accepts. Only registered users are ever
-- in a space. People in a space can reach each other: phone and email are shown to fellow members,
-- unless a member turns that off.

-- ── Contact within spaces ──────────────────────────────────────────────────────

alter table public.profiles add column if not exists share_contact_in_spaces boolean not null default true;

drop function if exists public.parish_space_people(uuid);
create or replace function public.parish_space_people(pid uuid)
returns table (user_id uuid, role text, display_name text, church_title text, avatar_url text, phone text, email text)
language sql stable security definer set search_path = public as $$
  select a.user_id, a.role, p.display_name, p.church_title, p.avatar_url,
         case when p.share_contact_in_spaces or a.user_id = auth.uid() then p.phone end,
         case when p.share_contact_in_spaces or a.user_id = auth.uid() then u.email end
  from public.parish_admins a
  join public.profiles p on p.id = a.user_id
  join auth.users u on u.id = a.user_id
  where a.parish_id = pid and a.verified and public.is_parish_space(pid)
  order by p.display_name;
$$;
grant execute on function public.parish_space_people(uuid) to authenticated;

-- ── Asking to join ─────────────────────────────────────────────────────────────

create table if not exists public.parish_space_requests (
  id uuid primary key default gen_random_uuid(),
  parish_id uuid not null references public.parishes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  note text check (char_length(note) <= 300),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  unique (parish_id, user_id)
);
alter table public.parish_space_requests enable row level security;
drop policy if exists "space requests: own or planners" on public.parish_space_requests;
create policy "space requests: own or planners" on public.parish_space_requests for select
  using (user_id = auth.uid() or public.can_plan_parish(parish_id));
-- Written only through the functions below

create or replace function public.request_to_join_space(pid uuid, p_note text default null)
returns text language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if not exists (select 1 from public.parishes where id = pid and status = 'published') then
    raise exception 'That parish is not in the directory' using errcode = '22023';
  end if;
  if exists (select 1 from public.parish_admins where parish_id = pid and user_id = auth.uid() and verified) then return 'member'; end if;
  insert into public.parish_space_requests (parish_id, user_id, note)
  values (pid, auth.uid(), left(p_note, 300))
  on conflict (parish_id, user_id) do update set note = excluded.note, status = 'pending', created_at = now(), decided_by = null, decided_at = null
    where public.parish_space_requests.status <> 'pending';
  return 'pending';
end;
$$;
grant execute on function public.request_to_join_space(uuid, text) to authenticated;

-- People asking to join, for the planners
create or replace function public.space_requests(pid uuid)
returns table (id uuid, user_id uuid, display_name text, church_title text, note text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, r.user_id, p.display_name, p.church_title, r.note, r.created_at
  from public.parish_space_requests r join public.profiles p on p.id = r.user_id
  where r.parish_id = pid and r.status = 'pending' and public.can_plan_parish(pid)
  order by r.created_at;
$$;
grant execute on function public.space_requests(uuid) to authenticated;

create or replace function public.decide_space_request(req_id uuid, approve boolean, p_role text default 'member')
returns void language plpgsql security definer set search_path = public as $$
declare r public.parish_space_requests;
begin
  select * into r from public.parish_space_requests where id = req_id;
  if r.id is null or not public.can_plan_parish(r.parish_id) then raise exception 'Only the parish can decide this' using errcode = '42501'; end if;
  if p_role not in ('member', 'minister') and not public.is_parish_admin(r.parish_id) then
    raise exception 'Only the shepherd or an administrator can give that role' using errcode = '42501';
  end if;
  update public.parish_space_requests set status = case when approve then 'approved' else 'declined' end, decided_by = auth.uid(), decided_at = now()
  where id = req_id;
  if approve then
    insert into public.parish_admins (parish_id, user_id, role, verified) values (r.parish_id, r.user_id, p_role, true)
    on conflict (parish_id, user_id) do update set verified = true;
  end if;
end;
$$;
grant execute on function public.decide_space_request(uuid, boolean, text) to authenticated;

-- ── Invitations ────────────────────────────────────────────────────────────────

create table if not exists public.parish_space_invites (
  id uuid primary key default gen_random_uuid(),
  parish_id uuid not null references public.parishes (id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  role text not null default 'member' check (role in ('shepherd', 'admin', 'parochial_committee', 'media', 'choir', 'editor', 'minister', 'member')),
  -- for one person (their email), or for anyone who has the link
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  revoked boolean not null default false,
  accepted_count integer not null default 0
);
alter table public.parish_space_invites enable row level security;
drop policy if exists "space invites: planners" on public.parish_space_invites;
create policy "space invites: planners" on public.parish_space_invites for select using (public.can_plan_parish(parish_id));
drop policy if exists "space invites: planners revoke" on public.parish_space_invites;
create policy "space invites: planners revoke" on public.parish_space_invites for update
  using (public.can_plan_parish(parish_id)) with check (public.can_plan_parish(parish_id));

create or replace function public.create_space_invite(pid uuid, p_role text default 'member', p_email text default null)
returns text language plpgsql security definer set search_path = public as $$
declare t text;
begin
  if not public.can_plan_parish(pid) then raise exception 'Only the parish can invite' using errcode = '42501'; end if;
  if p_role not in ('member', 'minister') and not public.is_parish_admin(pid) then
    raise exception 'Only the shepherd or an administrator can invite with that role' using errcode = '42501';
  end if;
  insert into public.parish_space_invites (parish_id, role, email, created_by)
  values (pid, p_role, nullif(lower(trim(p_email)), ''), auth.uid())
  returning token into t;
  return t;
end;
$$;
grant execute on function public.create_space_invite(uuid, text, text) to authenticated;

-- What an invitation is for, shown before signing in
create or replace function public.space_invite_details(p_token text)
returns table (parish_id uuid, parish_name text, city text, logo_url text, role text, invited_by text, for_email boolean, valid boolean)
language sql stable security definer set search_path = public as $$
  select i.parish_id, p.name, p.city, p.logo_url, i.role,
         nullif(trim(concat_ws(' ', pr.church_title, pr.display_name)), ''),
         i.email is not null,
         not i.revoked and i.expires_at > now() and (i.email is null or i.accepted_count = 0)
  from public.parish_space_invites i
  join public.parishes p on p.id = i.parish_id
  left join public.profiles pr on pr.id = i.created_by
  where i.token = p_token;
$$;
grant execute on function public.space_invite_details(text) to anon, authenticated;

create or replace function public.accept_space_invite(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare i public.parish_space_invites; my_email text;
begin
  if auth.uid() is null then raise exception 'Sign in or create an account first' using errcode = '42501'; end if;
  select * into i from public.parish_space_invites where token = p_token;
  if i.id is null or i.revoked or i.expires_at <= now() then raise exception 'This invitation is no longer valid' using errcode = '22023'; end if;
  select lower(email) into my_email from auth.users where id = auth.uid();
  if i.email is not null then
    if i.email <> my_email then raise exception 'This invitation was sent to another email address' using errcode = '42501'; end if;
    if i.accepted_count > 0 then raise exception 'This invitation has already been used' using errcode = '22023'; end if;
  end if;
  insert into public.parish_admins (parish_id, user_id, role, verified) values (i.parish_id, auth.uid(), i.role, true)
  on conflict (parish_id, user_id) do update set verified = true;
  update public.parish_space_invites set accepted_count = accepted_count + 1 where id = i.id;
  update public.parish_space_requests set status = 'approved', decided_at = now() where parish_id = i.parish_id and user_id = auth.uid() and status = 'pending';
  return i.parish_id;
end;
$$;
grant execute on function public.accept_space_invite(text) to authenticated;

-- Invitations sent to my email that I have not yet answered
create or replace function public.my_space_invites()
returns table (token text, parish_id uuid, parish_name text, role text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select i.token, i.parish_id, p.name, i.role, i.created_at
  from public.parish_space_invites i join public.parishes p on p.id = i.parish_id
  where i.email = (select lower(email) from auth.users where id = auth.uid())
    and not i.revoked and i.expires_at > now() and i.accepted_count = 0
    and not exists (select 1 from public.parish_admins a where a.parish_id = i.parish_id and a.user_id = auth.uid() and a.verified);
$$;
grant execute on function public.my_space_invites() to authenticated;

-- ── Leaving ────────────────────────────────────────────────────────────────────

create or replace function public.leave_space(pid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  -- A parish must keep at least one shepherd or administrator
  if exists (select 1 from public.parish_admins where parish_id = pid and user_id = auth.uid() and role in ('shepherd', 'admin'))
     and (select count(*) from public.parish_admins where parish_id = pid and verified and role in ('shepherd', 'admin')) <= 1 then
    raise exception 'Add another shepherd or administrator before you leave' using errcode = '22023';
  end if;
  delete from public.parish_admins where parish_id = pid and user_id = auth.uid();
end;
$$;
grant execute on function public.leave_space(uuid) to authenticated;
