-- Tour media bucket (2026-09-18, operator pick "1 2 and 3"): PUBLIC bucket
-- behind the /tour microsite — 360° panoramas + hero stills for the vacant
-- suites (131 / 133 first) and the manifest.json the page reads. Public read
-- by design (it IS the marketing site); operator-only write. 50 MB cap per
-- object (an 8K equirectangular JPEG is 10–25 MB). Nothing private ever goes
-- here — the private `assets` bucket keeps the operator photo library.
insert into storage.buckets (id, name, public, file_size_limit)
values ('tour', 'tour', true, 52428800)
on conflict (id) do update set public = true, file_size_limit = 52428800;

drop policy if exists "public read tour" on storage.objects;
create policy "public read tour" on storage.objects
  for select using (bucket_id = 'tour');

drop policy if exists "operator insert tour" on storage.objects;
create policy "operator insert tour" on storage.objects
  for insert with check (bucket_id = 'tour' and is_operator());

drop policy if exists "operator update tour" on storage.objects;
create policy "operator update tour" on storage.objects
  for update using (bucket_id = 'tour' and is_operator());

drop policy if exists "operator delete tour" on storage.objects;
create policy "operator delete tour" on storage.objects
  for delete using (bucket_id = 'tour' and is_operator());
