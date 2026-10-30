-- While the app is being tested with churches, every parish and ministry has the whole Partner plan.
-- Subscriptions, plans and payments are left in place. To bring pricing back, restore the body of this function
-- from 20261025000000_partner_plan_live.sql and set PRICING_ON in src/lib/plan.ts.
create or replace function public.parish_has_plan(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select true;
$$;
grant execute on function public.parish_has_plan(uuid) to anon, authenticated;

-- The studio's logos, pictures and videos: public to read, each person writes only in their own folder
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('studio-media', 'studio-media', true, 52428800, array['image/webp', 'image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'video/mp4', 'video/webm'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "studio media: own folder" on storage.objects;
create policy "studio media: own folder" on storage.objects for all to authenticated
  using (bucket_id = 'studio-media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'studio-media' and (storage.foldername(name))[1] = auth.uid()::text);
