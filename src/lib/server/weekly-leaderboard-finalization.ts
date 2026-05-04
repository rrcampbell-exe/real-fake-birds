import { getWeeklyChallengeForWeek } from '@/lib/constants/weekly-challenges';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { getCurrentWeekStart } from '@/lib/utils/weekly-leaderboard';
import {
  getWeeklyRewardSeeds,
  normalizeWeeklySeenBirdKeys,
  qualifiesForWeeklyChallenge,
  rankWeeklyLeaderboardRows,
  type WeeklyLeaderboardStatsRow,
} from '@/lib/server/weekly-leaderboard';

export function mapLeaderboardStatsRow(row: Record<string, unknown>): WeeklyLeaderboardStatsRow {
  return {
    userId: String(row.user_id ?? ''),
    usernameCanonical: typeof row.username_canonical === 'string' ? row.username_canonical : null,
    currentWeekStart: typeof row.current_week_start === 'string' ? row.current_week_start : null,
    weeklyBirdsSeen: typeof row.weekly_birds_seen === 'number' ? row.weekly_birds_seen : 0,
    weeklyBirdsIdentified: typeof row.weekly_birds_identified === 'number' ? row.weekly_birds_identified : 0,
    weeklySeedsEarned: typeof row.weekly_seeds_earned === 'number' ? row.weekly_seeds_earned : 0,
    weeklyBestStreak: typeof row.weekly_best_streak === 'number' ? row.weekly_best_streak : 0,
    weeklyNewBirdsDiscovered: typeof row.weekly_new_birds_discovered === 'number' ? row.weekly_new_birds_discovered : 0,
    weeklyFakeBirdsIdentified: typeof row.weekly_fake_birds_identified === 'number' ? row.weekly_fake_birds_identified : 0,
    weeklyRealBirdsIdentified: typeof row.weekly_real_birds_identified === 'number' ? row.weekly_real_birds_identified : 0,
    weeklyUniqueBirdsSeen: typeof row.weekly_unique_birds_seen === 'number' ? row.weekly_unique_birds_seen : 0,
    weeklySeenBirdKeys: normalizeWeeklySeenBirdKeys(row.weekly_seen_bird_keys),
    previousWeekStart: typeof row.previous_week_start === 'string' ? row.previous_week_start : null,
    previousWeekParticipated: Boolean(row.previous_week_participated),
    previousWeekQualified: Boolean(row.previous_week_qualified),
    previousWeekRank: typeof row.previous_week_rank === 'number' ? row.previous_week_rank : null,
    previousWeekRewardSeeds: typeof row.previous_week_reward_seeds === 'number' ? row.previous_week_reward_seeds : 0,
    previousWeekFinalizedAt: typeof row.previous_week_finalized_at === 'string' ? row.previous_week_finalized_at : null,
  };
}

export function createWeeklyResetState(currentWeekStart: string) {
  return {
    current_week_start: currentWeekStart,
    weekly_birds_seen: 0,
    weekly_birds_identified: 0,
    weekly_seeds_earned: 0,
    weekly_best_streak: 0,
    weekly_new_birds_discovered: 0,
    weekly_fake_birds_identified: 0,
    weekly_real_birds_identified: 0,
    weekly_unique_birds_seen: 0,
    weekly_seen_bird_keys: [],
    weekly_last_played_at: null,
  };
}

export async function tryInsertProgressEvent(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  eventId: string,
  eventType: string,
  occurredAt: string
): Promise<boolean> {
  const { error } = await admin
    .from('progress_event_log')
    .insert({
      user_id: userId,
      event_id: eventId,
      event_type: eventType,
      occurred_at: occurredAt,
    });

  return !error;
}

export interface WeeklyLeaderboardFinalizationResult {
  currentWeekStart: string;
  staleRowCount: number;
  weeksProcessed: string[];
}

export async function finalizeExpiredWeeklyLeaderboards(
  admin: ReturnType<typeof createSupabaseAdminClient>
): Promise<WeeklyLeaderboardFinalizationResult> {
  const currentWeekStart = getCurrentWeekStart();

  const { data: staleRows, error: staleRowsError } = await admin
    .from('leaderboard_stats')
    .select([
      'user_id',
      'username_canonical',
      'current_week_start',
      'weekly_birds_seen',
      'weekly_birds_identified',
      'weekly_seeds_earned',
      'weekly_best_streak',
      'weekly_new_birds_discovered',
      'weekly_fake_birds_identified',
      'weekly_real_birds_identified',
      'weekly_unique_birds_seen',
      'weekly_seen_bird_keys',
    ].join(', '))
    .not('current_week_start', 'is', null)
    .lt('current_week_start', currentWeekStart);

  if (staleRowsError) {
    console.error('[weekly-leaderboard] failed to query stale leaderboard rows', {
      currentWeekStart,
      error: staleRowsError.message,
      code: staleRowsError.code,
    });
    return { currentWeekStart, staleRowCount: 0, weeksProcessed: [] };
  }

  const expiredRows = (staleRows ?? []).map((row) => mapLeaderboardStatsRow(row as unknown as Record<string, unknown>));

  if (expiredRows.length === 0) {
    return { currentWeekStart, staleRowCount: 0, weeksProcessed: [] };
  }

  console.log('[weekly-leaderboard] finalizing expired leaderboard rows', {
    currentWeekStart,
    staleRowCount: expiredRows.length,
  });

  const progressUserIds = expiredRows.map((row) => row.userId);
  const { data: progressRows, error: progressRowsError } = await admin
    .from('player_progress')
    .select('user_id, seeds, best_weekly_placement, first_place_count, second_place_count, third_place_count')
    .in('user_id', progressUserIds);

  if (progressRowsError) {
    console.error('[weekly-leaderboard] failed to query player_progress for reward credits', {
      currentWeekStart,
      userCount: progressUserIds.length,
      error: progressRowsError.message,
      code: progressRowsError.code,
    });
  }

  const progressMap = new Map(
    (progressRows ?? []).map((row) => [
      row.user_id as string,
      {
        seeds: typeof row.seeds === 'number' ? row.seeds : 0,
        bestWeeklyPlacement: typeof row.best_weekly_placement === 'number' ? row.best_weekly_placement : null,
        firstPlaceCount: typeof row.first_place_count === 'number' ? row.first_place_count : 0,
        secondPlaceCount: typeof row.second_place_count === 'number' ? row.second_place_count : 0,
        thirdPlaceCount: typeof row.third_place_count === 'number' ? row.third_place_count : 0,
      },
    ])
  );

  const rowsByWeek = new Map<string, WeeklyLeaderboardStatsRow[]>();
  for (const row of expiredRows) {
    const weekStart = row.currentWeekStart;
    if (!weekStart) {
      continue;
    }

    const currentRows = rowsByWeek.get(weekStart) ?? [];
    currentRows.push(row);
    rowsByWeek.set(weekStart, currentRows);
  }

  for (const [weekStart, rows] of rowsByWeek.entries()) {
    console.log('[weekly-leaderboard] processing week', { weekStart, rowCount: rows.length });

    const challenge = getWeeklyChallengeForWeek(weekStart);
    const ranked = rankWeeklyLeaderboardRows(rows, challenge);
    const rankByUserId = new Map(ranked.rankedRows.map((item) => [item.userId, item.entry.rank]));
    const finalizedAt = new Date().toISOString();

    await Promise.all(rows.map(async (row) => {
      const participated = row.weeklyBirdsSeen > 0;
      const qualified = participated && qualifiesForWeeklyChallenge(row, challenge);
      const rank = qualified ? (rankByUserId.get(row.userId) ?? null) : null;
      const rewardSeeds = qualified ? getWeeklyRewardSeeds(rank) : 0;
      const rewardEventId = `weekly-leaderboard:${weekStart}:${row.userId}`;
      const progress = progressMap.get(row.userId) ?? {
        seeds: 0,
        bestWeeklyPlacement: null,
        firstPlaceCount: 0,
        secondPlaceCount: 0,
        thirdPlaceCount: 0,
      };

      const shouldCreditReward = rewardSeeds > 0
        ? await tryInsertProgressEvent(admin, row.userId, rewardEventId, 'weekly-leaderboard-finalized', finalizedAt)
        : false;

      if (shouldCreditReward) {
        const nextBestPlacement = rank
          ? (progress.bestWeeklyPlacement === null ? rank : Math.min(progress.bestWeeklyPlacement, rank))
          : progress.bestWeeklyPlacement;

        const { error: progressUpdateError } = await admin
          .from('player_progress')
          .update({
            seeds: progress.seeds + rewardSeeds,
            best_weekly_placement: nextBestPlacement,
            first_place_count: progress.firstPlaceCount + (rank === 1 ? 1 : 0),
            second_place_count: progress.secondPlaceCount + (rank === 2 ? 1 : 0),
            third_place_count: progress.thirdPlaceCount + (rank === 3 ? 1 : 0),
          })
          .eq('user_id', row.userId);

        if (progressUpdateError) {
          console.error('[weekly-leaderboard] failed to credit reward seeds', {
            userId: row.userId,
            weekStart,
            rewardSeeds,
            error: progressUpdateError.message,
            code: progressUpdateError.code,
          });
        }
      }

      const { count: updatedRowCount, error: leaderboardUpdateError } = await admin
        .from('leaderboard_stats')
        .update({
          ...createWeeklyResetState(currentWeekStart),
          previous_week_start: weekStart,
          previous_week_participated: participated,
          previous_week_qualified: qualified,
          previous_week_rank: rank,
          previous_week_reward_seeds: rewardSeeds,
          previous_week_finalized_at: finalizedAt,
        }, { count: 'exact' })
        .eq('user_id', row.userId)
        .lt('current_week_start', currentWeekStart);

      if (leaderboardUpdateError) {
        console.error('[weekly-leaderboard] failed to finalize leaderboard row', {
          userId: row.userId,
          weekStart,
          currentWeekStart,
          error: leaderboardUpdateError.message,
          code: leaderboardUpdateError.code,
        });
      } else if (updatedRowCount === 0) {
        console.warn('[weekly-leaderboard] finalization update matched 0 rows', {
          userId: row.userId,
          weekStart,
          currentWeekStart,
        });
      } else {
        console.log('[weekly-leaderboard] finalized row', {
          userId: row.userId,
          weekStart,
          participated,
          qualified,
          rank,
          rewardSeeds,
          rewardCredited: shouldCreditReward,
        });
      }
    }));
  }

  const weeksProcessed = Array.from(rowsByWeek.keys());
  console.log('[weekly-leaderboard] finalization complete', {
    currentWeekStart,
    weeksProcessed,
    totalRows: expiredRows.length,
  });

  return { currentWeekStart, staleRowCount: expiredRows.length, weeksProcessed };
}
