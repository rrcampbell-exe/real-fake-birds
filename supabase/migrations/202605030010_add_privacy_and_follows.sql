-- Add privacy_mode to profiles
alter table public.profiles
  add column if not exists privacy_mode text not null default 'public'
    constraint profiles_privacy_mode_values check (privacy_mode in ('public', 'private'));

-- Follow / block relationship table
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  related_user_id uuid not null references auth.users(id) on delete cascade,
  relationship_type text not null constraint follows_relationship_type_values check (relationship_type in ('follow', 'block')),
  status text not null default 'pending' constraint follows_status_values check (status in ('pending', 'approved')),
  created_at timestamptz not null default timezone('utc', now()),
  constraint follows_no_self_follow check (user_id <> related_user_id),
  constraint follows_unique_pair unique (user_id, related_user_id, relationship_type)
);

create index if not exists follows_user_id_idx on public.follows (user_id);
create index if not exists follows_related_user_id_idx on public.follows (related_user_id);

-- RLS: owners can manage their own follow/block rows
alter table public.follows enable row level security;

drop policy if exists "follows_select_own" on public.follows;
create policy "follows_select_own"
  on public.follows for select
  using (auth.uid() = user_id or auth.uid() = related_user_id);

drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own"
  on public.follows for insert
  with check (auth.uid() = user_id);

drop policy if exists "follows_update_own" on public.follows;
create policy "follows_update_own"
  on public.follows for update
  using (auth.uid() = user_id or auth.uid() = related_user_id);

drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_delete_own"
  on public.follows for delete
  using (auth.uid() = user_id);

-- Allow public read on profiles so the profile API can fetch by username_canonical
-- using the anon/service key. Visibility enforcement happens server-side.
-- (profiles RLS was owner-only; add a restricted public-read policy)
drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read"
  on public.profiles for select
  using (true);

-- Reload PostgREST schema cache so new tables are immediately visible
notify pgrst, 'reload schema';
