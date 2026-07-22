insert into storage.buckets (id, name, public) values ('assets','assets',false) on conflict (id) do nothing;
create policy "auth read assets" on storage.objects for select using (bucket_id = 'assets' and auth.uid() is not null);
create policy "operator insert assets" on storage.objects for insert with check (bucket_id = 'assets' and public.is_operator());
create policy "operator update assets" on storage.objects for update using (bucket_id = 'assets' and public.is_operator());
create policy "operator delete assets" on storage.objects for delete using (bucket_id = 'assets' and public.is_operator());
