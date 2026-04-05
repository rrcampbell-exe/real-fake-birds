create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text,
  username_canonical text,
  avatar_palette text not null default 'finch',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_username_shape check (
    username is null
    or username ~ '^[A-Za-z0-9_]{3,20}$'
  ),
  constraint profiles_username_pairing check (
    (username is null and username_canonical is null)
    or (username is not null and username_canonical is not null)
  ),
  constraint profiles_username_canonical_shape check (
    username_canonical is null
    or username_canonical ~ '^[a-z0-9_]{3,20}$'
  )
);

create unique index if not exists profiles_username_canonical_key
  on public.profiles (username_canonical)
  where username_canonical is not null;

create table if not exists public.player_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  birds_seen integer not null default 0 check (birds_seen >= 0),
  birds_identified integer not null default 0 check (birds_identified >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  best_streak integer not null default 0 check (best_streak >= 0),
  current_daily_streak integer not null default 0 check (current_daily_streak >= 0),
  best_daily_streak integer not null default 0 check (best_daily_streak >= 0),
  seeds integer not null default 0 check (seeds >= 0),
  streak_insurance_active boolean not null default false,
  streak_insurance_purchased_at timestamptz,
  local_state_version integer not null default 1,
  last_local_sync_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.daily_challenge_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_date date not null,
  correct_answers integer not null default 0 check (correct_answers >= 0),
  rounds_played integer not null default 0 check (rounds_played >= 0),
  completed boolean not null default false,
  bonus_seeds_awarded integer not null default 0 check (bonus_seeds_awarded >= 0),
  claimed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, challenge_date)
);

create table if not exists public.unlocked_themes (
  user_id uuid not null references auth.users(id) on delete cascade,
  theme_name text not null,
  unlocked_via text not null default 'migration',
  unlocked_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, theme_name)
);

create table if not exists public.milestones (
  user_id uuid not null references auth.users(id) on delete cascade,
  milestone_value integer not null check (milestone_value >= 0),
  badge_name text,
  unlocked_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, milestone_value)
);

create table if not exists public.bird_journal (
  user_id uuid not null references auth.users(id) on delete cascade,
  bird_key text not null,
  bird_name text not null,
  is_real boolean not null,
  seen_count integer not null default 1 check (seen_count >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  incorrect_count integer not null default 0 check (incorrect_count >= 0),
  last_seen_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, bird_key)
);

create table if not exists public.leaderboard_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username_canonical text,
  birds_identified integer not null default 0 check (birds_identified >= 0),
  best_streak integer not null default 0 check (best_streak >= 0),
  best_daily_streak integer not null default 0 check (best_daily_streak >= 0),
  accuracy numeric(5,2) not null default 0,
  seeds integer not null default 0 check (seeds >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists daily_challenge_history_user_date_idx
  on public.daily_challenge_history (user_id, challenge_date desc);

create index if not exists unlocked_themes_user_idx
  on public.unlocked_themes (user_id);

create index if not exists milestones_user_idx
  on public.milestones (user_id);

create index if not exists bird_journal_user_seen_idx
  on public.bird_journal (user_id, last_seen_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.player_progress (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.leaderboard_stats (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists player_progress_set_updated_at on public.player_progress;
create trigger player_progress_set_updated_at
  before update on public.player_progress
  for each row execute procedure public.set_updated_at();

drop trigger if exists daily_challenge_history_set_updated_at on public.daily_challenge_history;
create trigger daily_challenge_history_set_updated_at
  before update on public.daily_challenge_history
  for each row execute procedure public.set_updated_at();

drop trigger if exists bird_journal_set_updated_at on public.bird_journal;
create trigger bird_journal_set_updated_at
  before update on public.bird_journal
  for each row execute procedure public.set_updated_at();

drop trigger if exists leaderboard_stats_set_updated_at on public.leaderboard_stats;
create trigger leaderboard_stats_set_updated_at
  before update on public.leaderboard_stats
  for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.player_progress enable row level security;
alter table public.daily_challenge_history enable row level security;
alter table public.unlocked_themes enable row level security;
alter table public.milestones enable row level security;
alter table public.bird_journal enable row level security;
alter table public.leaderboard_stats enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using ((select auth.uid()) = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "player_progress_manage_own" on public.player_progress;
create policy "player_progress_manage_own"
  on public.player_progress for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "daily_challenge_history_manage_own" on public.daily_challenge_history;
create policy "daily_challenge_history_manage_own"
  on public.daily_challenge_history for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "unlocked_themes_manage_own" on public.unlocked_themes;
create policy "unlocked_themes_manage_own"
  on public.unlocked_themes for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "milestones_manage_own" on public.milestones;
create policy "milestones_manage_own"
  on public.milestones for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "bird_journal_manage_own" on public.bird_journal;
create policy "bird_journal_manage_own"
  on public.bird_journal for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "leaderboard_stats_manage_own" on public.leaderboard_stats;
create policy "leaderboard_stats_manage_own"
  on public.leaderboard_stats for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
