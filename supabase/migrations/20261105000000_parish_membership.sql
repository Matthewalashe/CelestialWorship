-- Adding a parish and joining one now lead straight to its space.
--   · Whoever adds a parish is in its space at once, while moderators check the directory entry.
--     They cannot publish it themselves (restrict_parish_columns keeps the status), and Online Church lists published parishes only.
--   · A parish with nobody to admit people lets the first members straight in, instead of leaving them waiting for ever.
--   · A rejected parish loses its space.

create or replace function public.claim_new_ministry()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  rel text := coalesce(new.registrant_relationship, 'owner');
begin
  if new.submitted_by is not null then
    insert into public.parish_admins (parish_id, user_id, role, verified, relationship, office)
    values (new.id, new.submitted_by,
            case when new.kind = 'ministry' then 'shepherd' else 'admin' end, true,
            case when new.kind = 'ministry' then rel end,
            case when new.kind <> 'ministry' then null when rel = 'owner' then 'Founder' else 'Supporting minister' end)
    on conflict do nothing;
    update public.profiles set parish_id = new.id where id = new.submitted_by and parish_id is null;
  end if;
  return new;
end;
$$;

create or replace function public.release_rejected_parish()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'rejected' and old.status <> 'rejected' then
    delete from public.parish_admins where parish_id = new.id;
    update public.profiles set parish_id = null where parish_id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists release_rejected_parish on public.parishes;
create trigger release_rejected_parish after update on public.parishes
  for each row execute function public.release_rejected_parish();

-- The space list says when a parish is still waiting for its directory entry
create or replace view public.my_parish_spaces with (security_invoker = true) as
  select a.parish_id, a.role, p.name, p.city, p.logo_url, p.status
  from public.parish_admins a join public.parishes p on p.id = a.parish_id
  where a.user_id = auth.uid() and a.verified and p.status <> 'rejected';
grant select on public.my_parish_spaces to authenticated;

create or replace function public.parish_has_leader(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.parish_admins where parish_id = pid and verified
                 and role in ('shepherd', 'admin', 'parochial_committee', 'editor'));
$$;

create or replace function public.request_to_join_space(pid uuid, p_note text default null)
returns text language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if not exists (select 1 from public.parishes where id = pid and status = 'published') then
    raise exception 'That parish is not in the directory' using errcode = '22023';
  end if;
  if exists (select 1 from public.parish_admins where parish_id = pid and user_id = auth.uid() and verified) then return 'member'; end if;
  -- Nobody leads this parish on the app yet, so there is nobody to wait for
  if not public.parish_has_leader(pid) then
    insert into public.parish_admins (parish_id, user_id, role, verified) values (pid, auth.uid(), 'member', true)
    on conflict (parish_id, user_id) do update set verified = true;
    update public.parish_space_requests set status = 'approved', decided_at = now() where parish_id = pid and user_id = auth.uid();
    return 'member';
  end if;
  insert into public.parish_space_requests (parish_id, user_id, note)
  values (pid, auth.uid(), left(p_note, 300))
  on conflict (parish_id, user_id) do update set note = excluded.note, status = 'pending', created_at = now(), decided_by = null, decided_at = null
    where public.parish_space_requests.status <> 'pending';
  return 'pending';
end;
$$;
grant execute on function public.request_to_join_space(uuid, text) to authenticated;

-- A suggested parish, once added, has the person who suggested it as its first member
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
  insert into public.parishes (name, kind, country, state_region, city, address, latitude, longitude, shepherd_name, phone, email,
                               service_times, contact_public, status)
  values (l.name, 'parish', l.country, l.state_region, l.city, l.address, l.latitude, l.longitude, l.shepherd_name, l.phone, l.email,
          case when l.sunday_time is not null then jsonb_build_array(jsonb_build_object('service', 'lords_day_service', 'day', 'Sunday', 'time', l.sunday_time)) end,
          false, 'published')
  returning id into new_id;
  update public.parish_leads set status = 'added', parish_id = new_id where id = lead;
  if l.submitted_by is not null then
    insert into public.parish_admins (parish_id, user_id, role, verified) values (new_id, l.submitted_by, 'member', true) on conflict do nothing;
    update public.profiles set parish_id = new_id where id = l.submitted_by and parish_id is null;
  end if;
  return new_id;
end $$;
revoke all on function public.publish_parish_lead(uuid) from public, anon;
grant execute on function public.publish_parish_lead(uuid) to authenticated;

-- ── Everyone already stuck ─────────────────────────────────────────────────────

update public.parish_admins a set verified = true
  from public.parishes p
  where p.id = a.parish_id and p.submitted_by = a.user_id and not a.verified and p.status <> 'rejected';

update public.profiles pr set parish_id = p.id
  from public.parishes p
  where p.submitted_by = pr.id and pr.parish_id is null and p.status <> 'rejected';

insert into public.parish_admins (parish_id, user_id, role, verified)
  select l.parish_id, l.submitted_by, 'member', true from public.parish_leads l
  where l.status = 'added' and l.parish_id is not null and l.submitted_by is not null
  on conflict do nothing;

-- Requests waiting on parishes with nobody to answer them
insert into public.parish_admins (parish_id, user_id, role, verified)
  select r.parish_id, r.user_id, 'member', true from public.parish_space_requests r
  where r.status = 'pending' and not public.parish_has_leader(r.parish_id)
  on conflict (parish_id, user_id) do update set verified = true;
update public.parish_space_requests r set status = 'approved', decided_at = now()
  where r.status = 'pending'
    and exists (select 1 from public.parish_admins a where a.parish_id = r.parish_id and a.user_id = r.user_id and a.verified);
