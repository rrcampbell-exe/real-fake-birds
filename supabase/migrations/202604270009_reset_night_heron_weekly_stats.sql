-- One-time repair: reset weekly stats for night_heron after the weekly challenge
-- rollover bug caused last week's Explorer stats to carry over into the current week
-- without the finalization recap being recorded.
--
-- This zeroes all current-week fields and back-populates previous_week_* so the
-- recap modal will appear on next app open.

do $$
declare
  v_user_id uuid;
  v_week_start date := current_date - (extract(isodow from current_date)::int % 7);
begin
  select ls.user_id into v_user_id
  from public.leaderboard_stats ls
  join public.profiles p on p.user_id = ls.user_id
  where p.username_canonical = 'night_heron'
  limit 1;

  if v_user_id is null then
    raise notice 'night_heron leaderboard row not found – skipping';
    return;
  end if;

  update public.leaderboard_stats
  set
    current_week_start        = v_week_start,
    weekly_birds_seen         = 0,
    weekly_birds_identified   = 0,
    weekly_seeds_earned       = 0,
    weekly_best_streak        = 0,
    weekly_new_birds_discovered = 0,
    weekly_fake_birds_identified = 0,
    weekly_real_birds_identified = 0,
    weekly_unique_birds_seen  = 0,
    weekly_seen_bird_keys     = '[]'::jsonb,
    weekly_last_played_at     = null
  where user_id = v_user_id;

  raise notice 'Reset weekly stats for night_heron (user_id = %)', v_user_id;
end $$;
