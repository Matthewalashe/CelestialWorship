-- ─────────────────────────────────────────────────────────────
-- Parishes people say are missing from the directory
-- ─────────────────────────────────────────────────────────────
-- Anyone finishing onboarding (signed in or not) can describe their parish: its full address, a pin on the map,
-- the shepherd and how to reach it. Moderators read the list and add a parish to the directory in one step.

create table if not exists public.parish_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  submitted_by uuid references auth.users (id) on delete set null default auth.uid(),
  name text not null check (char_length(name) between 3 and 160),
  country text not null check (char_length(country) between 2 and 80),
  state_region text check (char_length(state_region) <= 80),
  city text check (char_length(city) <= 80),
  address text check (char_length(address) <= 300),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  shepherd_name text check (char_length(shepherd_name) <= 120),
  phone text check (char_length(phone) <= 40),
  email text check (char_length(email) <= 160),
  sunday_time text check (sunday_time ~ '^\d{2}:\d{2}$'),
  contact_name text check (char_length(contact_name) <= 120),
  notes text check (char_length(notes) <= 500),
  status text not null default 'new' check (status in ('new', 'added', 'dismissed')),
  parish_id uuid references public.parishes (id) on delete set null,
  check ((latitude is null) = (longitude is null))
);

alter table public.parish_leads enable row level security;

drop policy if exists "Anyone can suggest a parish" on public.parish_leads;
create policy "Anyone can suggest a parish" on public.parish_leads for insert to anon, authenticated
  with check (status = 'new' and parish_id is null and (submitted_by is null or submitted_by = auth.uid()));

drop policy if exists "Moderators read suggested parishes" on public.parish_leads;
create policy "Moderators read suggested parishes" on public.parish_leads for select using (public.is_moderator());

drop policy if exists "Moderators decide on suggested parishes" on public.parish_leads;
create policy "Moderators decide on suggested parishes" on public.parish_leads for update
  using (public.is_moderator()) with check (public.is_moderator());

create index if not exists parish_leads_new on public.parish_leads (created_at) where status = 'new';

-- Add a suggested parish to the directory (published straight away; its contacts stay private until the parish says otherwise)
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
  return new_id;
end $$;

revoke all on function public.publish_parish_lead(uuid) from public, anon;
grant execute on function public.publish_parish_lead(uuid) to authenticated;
