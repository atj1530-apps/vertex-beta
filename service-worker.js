-- 6A34 — Cross-device settings table (Supabase = source of truth)
-- Project: dwsrwsnzuiwnagjepgtj  (Vertex Beta)
-- Run this once in: Supabase Dashboard -> SQL Editor -> New query -> Run

create table if not exists public.vertex_user_settings (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  settings   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.vertex_user_settings enable row level security;

drop policy if exists "vertex_user_settings own select" on public.vertex_user_settings;
drop policy if exists "vertex_user_settings own insert" on public.vertex_user_settings;
drop policy if exists "vertex_user_settings own update" on public.vertex_user_settings;
drop policy if exists "vertex_user_settings own delete" on public.vertex_user_settings;

create policy "vertex_user_settings own select"
  on public.vertex_user_settings for select
  using (auth.uid() = user_id);

create policy "vertex_user_settings own insert"
  on public.vertex_user_settings for insert
  with check (auth.uid() = user_id);

create policy "vertex_user_settings own update"
  on public.vertex_user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "vertex_user_settings own delete"
  on public.vertex_user_settings for delete
  using (auth.uid() = user_id);

-- 6A35 — enable Realtime on the settings table (idempotent).
-- Lets a change on one device update the other within a second or two, no refresh needed.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'vertex_user_settings'
  ) then
    execute 'alter publication supabase_realtime add table public.vertex_user_settings';
  end if;
end $$;
