-- Weekly quiz & map-game leaderboard. Players opt in from the app; scores are earned on the device,
-- so the server bounds them (per post and per week) rather than trusting any number.

create table if not exists public.game_scores (
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,                     -- Monday
  xp integer not null default 0 check (xp between 0 and 6000),
  parish_id uuid references public.parishes (id) on delete set null,
  posts integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);
create index if not exists game_scores_week_idx on public.game_scores (week_start, xp desc);
alter table public.game_scores enable row level security;

drop policy if exists "scores: read" on public.game_scores;
create policy "scores: read" on public.game_scores for select to authenticated using (true);
drop policy if exists "scores: leave" on public.game_scores;
create policy "scores: leave" on public.game_scores for delete using (auth.uid() = user_id);
-- No insert/update policy: writes only through post_week_xp

-- Post this week's total. It may only grow, by at most 1500 per post and 200 posts a week.
create or replace function public.post_week_xp(p_xp integer)
returns integer language plpgsql security definer set search_path = public as $$
declare
  wk date := date_trunc('week', now())::date;
  current_xp integer;
  result integer;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  select xp into current_xp from public.game_scores where user_id = auth.uid() and week_start = wk;
  insert into public.game_scores as g (user_id, week_start, xp, parish_id, posts)
  values (auth.uid(), wk, least(greatest(p_xp, 0), 1500, 6000),
          (select parish_id from public.profiles where id = auth.uid()), 1)
  on conflict (user_id, week_start) do update
    set xp = least(greatest(g.xp, least(p_xp, g.xp + 1500)), 6000),
        parish_id = (select parish_id from public.profiles where id = auth.uid()),
        posts = g.posts + 1,
        updated_at = now()
    where g.posts < 200
  returning xp into result;
  return coalesce(result, current_xp, 0);
end;
$$;
revoke all on function public.post_week_xp(integer) from public, anon;
grant execute on function public.post_week_xp(integer) to authenticated;

-- Names come from the public profile only
create or replace view public.game_leaderboard with (security_invoker = true) as
  select g.week_start, g.xp, g.parish_id, g.user_id,
         nullif(trim(concat_ws(' ', pp.church_title, pp.display_name)), '') as name
  from public.game_scores g
  join public.public_profiles pp on pp.id = g.user_id;
grant select on public.game_leaderboard to authenticated;
