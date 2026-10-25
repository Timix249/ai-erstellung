-- In Supabase SQL Editor einmal ausführen. Niemals RLS deaktivieren.
create table if not exists public.wolke_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 1 check (revision > 0),
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.wolke_state enable row level security;
revoke all on public.wolke_state from anon;
grant select, insert, update on public.wolke_state to authenticated;
drop policy if exists "own_wolke_state" on public.wolke_state;
create policy "own_wolke_state" on public.wolke_state for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
