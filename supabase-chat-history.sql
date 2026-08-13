create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  session_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 12000),
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_session_created_at_idx
  on public.chat_messages (session_id, created_at);

alter table public.chat_messages enable row level security;

drop policy if exists "chat messages are readable" on public.chat_messages;
drop policy if exists "chat messages are insertable" on public.chat_messages;

create policy "chat messages are readable"
  on public.chat_messages
  for select
  to anon, authenticated
  using (true);

create policy "chat messages are insertable"
  on public.chat_messages
  for insert
  to anon, authenticated
  with check (
    role in ('user', 'assistant')
    and char_length(session_id) between 16 and 80
    and session_id ~ '^[a-z0-9-]+$'
    and char_length(content) between 1 and 12000
  );

select
  n.nspname as schema,
  c.relname as table,
  c.relrowsecurity as rls_enabled,
  p.policyname,
  p.cmd
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
where n.nspname = 'public'
  and c.relname = 'chat_messages'
order by p.policyname;
