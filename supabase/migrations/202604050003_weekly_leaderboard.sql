alter table public.player_progress
  add column if not exists best_weekly_placement integer check (best_weekly_placement is null or best_weekly_placement > 0),
  add column if not exists first_place_count integer not null default 0 check (first_place_count >= 0),
  add column if not exists second_place_count integer not null default 0 check (second_place_count >= 0),
  add column if not exists third_place_count integer not null default 0 check (third_place_count >= 0);

alter table public.leaderboard_stats
  add column if not exists current_week_start date,
  add column if not exists weekly_birds_seen integer not null default 0 check (weekly_birds_seen >= 0),
  add column if not exists weekly_birds_identified integer not null default 0 check (weekly_birds_identified >= 0),
  add column if not exists weekly_seeds_earned integer not null default 0 check (weekly_seeds_earned >= 0),
  add column if not exists weekly_best_streak integer not null default 0 check (weekly_best_streak >= 0),
  add column if not exists weekly_new_birds_discovered integer not null default 0 check (weekly_new_birds_discovered >= 0),
  add column if not exists weekly_fake_birds_identified integer not null default 0 check (weekly_fake_birds_identified >= 0),
  add column if not exists weekly_real_birds_identified integer not null default 0 check (weekly_real_birds_identified >= 0),
  add column if not exists weekly_unique_birds_seen integer not null default 0 check (weekly_unique_birds_seen >= 0),
  add column if not exists weekly_seen_bird_keys jsonb not null default '[]'::jsonb,
  add column if not exists weekly_last_played_at timestamptz,
  add column if not exists previous_week_start date,
  add column if not exists previous_week_participated boolean not null default false,
  add column if not exists previous_week_qualified boolean not null default false,
  add column if not exists previous_week_rank integer check (previous_week_rank is null or previous_week_rank > 0),
  add column if not exists previous_week_reward_seeds integer not null default 0 check (previous_week_reward_seeds >= 0),
  add column if not exists previous_week_finalized_at timestamptz;

create index if not exists leaderboard_stats_current_week_idx
  on public.leaderboard_stats (current_week_start);

create index if not exists leaderboard_stats_current_week_birds_seen_idx
  on public.leaderboard_stats (current_week_start, weekly_birds_seen desc);

create index if not exists leaderboard_stats_current_week_birds_identified_idx
  on public.leaderboard_stats (current_week_start, weekly_birds_identified desc);

create index if not exists leaderboard_stats_current_week_seeds_idx
  on public.leaderboard_stats (current_week_start, weekly_seeds_earned desc);

create index if not exists leaderboard_stats_current_week_best_streak_idx
  on public.leaderboard_stats (current_week_start, weekly_best_streak desc);
