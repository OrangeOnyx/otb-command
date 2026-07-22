-- H4: scope AI transcripts to their creator. Owners see only their own chats;
-- the operator keeps a full read (shared desk). Insert/read both scoped.
create or replace function public.owns_thread(t uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.chat_threads ct
    join public.profiles p on p.id = auth.uid()
    where ct.id = t and (ct.created_by = p.email or p.role = 'operator')
  );
$$;

drop policy if exists "owner+operator read threads" on public.chat_threads;
create policy "read own threads or operator" on public.chat_threads for select
  using (is_operator() or (is_owner_or_operator() and created_by = (select email from public.profiles where id = auth.uid())));
drop policy if exists "owner+operator insert threads" on public.chat_threads;
create policy "insert own threads" on public.chat_threads for insert
  with check (is_owner_or_operator() and created_by = (select email from public.profiles where id = auth.uid()));

drop policy if exists "owner+operator read messages" on public.chat_messages;
create policy "read messages of own threads or operator" on public.chat_messages for select
  using (owns_thread(thread_id));
drop policy if exists "owner+operator insert messages" on public.chat_messages;
create policy "insert messages into own threads" on public.chat_messages for insert
  with check (owns_thread(thread_id));

-- M7(server): server-side upload size caps on the two null-limit buckets (25 MB)
update storage.buckets set file_size_limit = 26214400 where id in ('vendor-docs','assets');
