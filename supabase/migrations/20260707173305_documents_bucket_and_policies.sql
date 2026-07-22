-- P1 Document Repository: private documents bucket, policies cloned from assets
insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 26214400)
on conflict (id) do nothing;

create policy "auth read documents" on storage.objects
  for select using (bucket_id = 'documents' and auth.uid() is not null);

create policy "operator insert documents" on storage.objects
  for insert with check (bucket_id = 'documents' and is_operator());

create policy "operator update documents" on storage.objects
  for update using (bucket_id = 'documents' and is_operator());

create policy "operator delete documents" on storage.objects
  for delete using (bucket_id = 'documents' and is_operator());
