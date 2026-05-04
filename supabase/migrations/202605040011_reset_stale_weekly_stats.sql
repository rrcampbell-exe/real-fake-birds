-- Bulk repair: reset weekly stats for all rows where current_week_start has been
-- advanced to the current week (by ensureAccountProfileFromUserMetadata) but the
-- weekly counters still reflect last week's activity (weekly_last_played_at is null
-- or falls before the current week start).
--
-- Root cause: ensureAccountProfileFromUserMetadata upserted current_week_start before
-- finalizeExpiredWeeklyLeaderboards ran, so finalization never processed those rows.
-- The fix (reordering the two calls) is deployed; this migration cleans up affected rows.

do $$
declare
  v_week_start date;
  v_affected   int;
begin
  -- Current week start: most recent Monday in America/Chicago time.
  -- Using AT TIME ZONE to get the local date, then back-calculate to Monday.
  v_week_start := date_trunc('week',
    (now() at time zone 'America/Chicago')::date + interval '1 day'
  )::date - interval '1 day';

  update public.leaderboard_stats
  set
    current_week_start           = v_week_start,
    weekly_birds_seen            = 0,
    weekly_birds_identified      = 0,
    weekly_seeds_earned          = 0,
    weekly_best_streak           = 0,
    weekly_new_birds_discovered  = 0,
    weekly_fake_birds_identified = 0,
    weekly_real_birds_identified = 0,
    weekly_unique_birds_seen     = 0,
    weekly_seen_bird_keys        = '[]'::jsonb,
    weekly_last_played_at        = null
  where current_week_start = v_week_start
    and (
      weekly_last_played_at is null
      or weekly_last_played_at < (v_week_start at time zone 'America/Chicago')
    );

  get diagnostics v_affected = row_count;
  raise notice 'Reset weekly stats for % rows (week_start = %)', v_affected, v_week_start;
end $$;
