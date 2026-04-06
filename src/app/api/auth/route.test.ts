import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/env', () => ({
  hasSupabaseEnv: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: vi.fn(),
  createSupabaseServerClient: vi.fn(),
}));

import { hasSupabaseEnv } from '@/lib/supabase/env';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { POST, shouldClearServerStreakInsurance } from './route';

const mockedHasSupabaseEnv = vi.mocked(hasSupabaseEnv);
const mockedCreateSupabaseAdminClient = vi.mocked(createSupabaseAdminClient);
const mockedCreateSupabaseServerClient = vi.mocked(createSupabaseServerClient);

function mockAuthenticatedUser() {
  mockedCreateSupabaseServerClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1', email: 'bird@example.com' } },
        error: null,
      }),
    },
  } as never);
}

describe('auth route', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockedHasSupabaseEnv.mockReturnValue(false);
  });

  it('rejects malformed requests', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth', {
        method: 'POST',
        body: JSON.stringify({ action: 'unknown' }),
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'invalid_request' });
  });

  it('returns validation issues and marks invalid usernames unavailable', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth', {
        method: 'POST',
        body: JSON.stringify({ action: 'validate-username', username: 'Adm1n' }),
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      action: 'validate-username',
      isValid: false,
      issues: ['reserved'],
      normalizedUsername: 'adm1n',
      available: false,
    });
  });

  it('returns availability as unknown when validation passes but Supabase is not configured', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth', {
        method: 'POST',
        body: JSON.stringify({ action: 'validate-username', username: 'BirdFan_17' }),
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );

    expect(mockedCreateSupabaseAdminClient).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      action: 'validate-username',
      isValid: true,
      issues: [],
      normalizedUsername: 'birdfan_17',
      available: null,
    });
  });

  it('checks availability through Supabase when configured', async () => {
    mockedHasSupabaseEnv.mockReturnValue(true);
    mockedCreateSupabaseAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ count: 1, error: null }),
          }),
        }),
      }),
    } as never);

    const response = await POST(
      new Request('http://localhost/api/auth', {
        method: 'POST',
        body: JSON.stringify({ action: 'validate-username', username: 'BirdFan_17' }),
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );

    await expect(response.json()).resolves.toEqual({
      action: 'validate-username',
      isValid: true,
      issues: [],
      normalizedUsername: 'birdfan_17',
      available: false,
    });
  });

  it('registers an account with username, email, and password in one server-side flow', async () => {
    mockedHasSupabaseEnv.mockReturnValue(true);

    const createUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1', email: 'bird@example.com' } },
      error: null,
    });
    const deleteUser = vi.fn().mockResolvedValue({ error: null });
    const profileUpsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            username: 'BirdFan_17',
            username_canonical: 'birdfan_17',
            avatar_palette: 'finch',
          },
          error: null,
        }),
      }),
    });
    const leaderboardUpsert = vi.fn().mockResolvedValue({ error: null });

    mockedCreateSupabaseAdminClient.mockReturnValue({
      auth: {
        admin: {
          createUser,
          deleteUser,
        },
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            upsert: profileUpsert,
          };
        }

        if (table === 'leaderboard_stats') {
          return {
            select: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                lt: vi.fn().mockResolvedValue({ data: [] }),
              }),
            }),
            upsert: leaderboardUpsert,
          };
        }

        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          }),
        };
      }),
    } as never);

    const response = await POST(
      new Request('http://localhost/api/auth', {
        method: 'POST',
        body: JSON.stringify({
          action: 'register-account',
          username: 'BirdFan_17',
          email: 'bird@example.com',
          password: 'secret-password',
        }),
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );

    expect(response.status).toBe(200);
    expect(createUser).toHaveBeenCalledWith({
      email: 'bird@example.com',
      password: 'secret-password',
      email_confirm: true,
      user_metadata: {
        requested_username: 'BirdFan_17',
      },
    });
    expect(deleteUser).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      action: 'register-account',
      account: {
        email: 'bird@example.com',
        username: 'BirdFan_17',
        usernameCanonical: 'birdfan_17',
        avatarPalette: 'finch',
      },
    });
  });

  it('purchases a theme for an authenticated user', async () => {
    mockedHasSupabaseEnv.mockReturnValue(true);
    mockAuthenticatedUser();

    const progressSelect = vi.fn()
      .mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              birds_seen: 7,
              birds_identified: 4,
              seeds: 20,
              current_streak: 2,
              best_streak: 2,
              current_daily_streak: 1,
              best_daily_streak: 1,
            },
          }),
        }),
      })
      .mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              birds_seen: 7,
              birds_identified: 4,
              seeds: 10,
              current_streak: 2,
              best_streak: 2,
              current_daily_streak: 1,
              best_daily_streak: 1,
            },
          }),
        }),
      });

    const unlockedThemesSelect = vi.fn()
      .mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      })
      .mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ data: [{ theme_name: 'Raven' }] }),
      });

    const adminClient = {
      from: vi.fn((table: string) => {
        if (table === 'player_progress') {
          return {
            select: progressSelect,
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          };
        }

        if (table === 'unlocked_themes') {
          return {
            select: unlockedThemesSelect,
            upsert: vi.fn().mockResolvedValue({ error: null }),
          };
        }

        return {
          select: vi.fn(),
        };
      }),
    };

    mockedCreateSupabaseAdminClient.mockReturnValue(adminClient as never);

    const response = await POST(
      new Request('http://localhost/api/auth', {
        method: 'POST',
        body: JSON.stringify({ action: 'purchase-theme', themeName: 'Raven' }),
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      action: 'purchase-theme',
      unlockedThemes: ['Raven'],
      progressSummary: {
        birdsIdentified: 4,
        seeds: 10,
        bestStreak: 2,
        bestDailyStreak: 1,
      },
      purchaseApplied: true,
    });
  });

  it('claims a daily reward idempotently for an authenticated user', async () => {
    mockedHasSupabaseEnv.mockReturnValue(true);
    mockAuthenticatedUser();

    const playerProgressSelect = vi.fn()
      .mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              birds_seen: 8,
              birds_identified: 5,
              seeds: 20,
              current_streak: 3,
              best_streak: 4,
              current_daily_streak: 2,
              best_daily_streak: 2,
            },
          }),
        }),
      })
      .mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              birds_seen: 8,
              birds_identified: 5,
              seeds: 45,
              current_streak: 3,
              best_streak: 4,
              current_daily_streak: 2,
              best_daily_streak: 2,
            },
          }),
        }),
      });

    const adminClient = {
      from: vi.fn((table: string) => {
        if (table === 'progress_event_log') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                }),
              }),
            }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }

        if (table === 'player_progress') {
          return {
            select: playerProgressSelect,
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          };
        }

        if (table === 'daily_challenge_history') {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null }),
          };
        }

        if (table === 'leaderboard_stats') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
              not: vi.fn().mockReturnValue({
                lt: vi.fn().mockResolvedValue({ data: [] }),
              }),
            }),
            upsert: vi.fn().mockResolvedValue({ error: null }),
          };
        }

        return {
          select: vi.fn(),
        };
      }),
    };

    mockedCreateSupabaseAdminClient.mockReturnValue(adminClient as never);

    const response = await POST(
      new Request('http://localhost/api/auth', {
        method: 'POST',
        body: JSON.stringify({
          action: 'claim-daily-challenge-bonuses',
          date: '2026-04-04',
          rewardSeeds: 25,
          correctAnswers: 4,
          roundsPlayed: 5,
        }),
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      action: 'claim-daily-challenge-bonuses',
      date: '2026-04-04',
      rewardSeeds: 25,
      progressSummary: {
        birdsSeen: 8,
        birdsIdentified: 5,
        seeds: 45,
        currentStreak: 3,
        bestStreak: 4,
        currentDailyStreak: 2,
        bestDailyStreak: 2,
      },
    });
  });

  it('purchases streak insurance for an authenticated user', async () => {
    mockedHasSupabaseEnv.mockReturnValue(true);
    mockAuthenticatedUser();

    const playerProgressSelect = vi.fn()
      .mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              current_streak: 6,
              seeds: 60,
              streak_insurance_active: false,
              streak_insurance_purchased_at: null,
            },
          }),
        }),
      })
      .mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              birds_seen: 12,
              birds_identified: 9,
              seeds: 50,
              current_streak: 6,
              best_streak: 7,
              current_daily_streak: 3,
              best_daily_streak: 4,
            },
          }),
        }),
      });

    const adminClient = {
      from: vi.fn((table: string) => {
        if (table === 'player_progress') {
          return {
            select: playerProgressSelect,
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          };
        }

        return {
          select: vi.fn(),
        };
      }),
    };

    mockedCreateSupabaseAdminClient.mockReturnValue(adminClient as never);

    const response = await POST(
      new Request('http://localhost/api/auth', {
        method: 'POST',
        body: JSON.stringify({ action: 'purchase-streak-insurance' }),
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      action: 'purchase-streak-insurance',
      progressSummary: {
        birdsSeen: 12,
        birdsIdentified: 9,
        seeds: 50,
        currentStreak: 6,
        bestStreak: 7,
        currentDailyStreak: 3,
        bestDailyStreak: 4,
      },
      insuranceState: {
        active: true,
        protectedMissesRemaining: 1,
        cost: 10,
        purchasedAtStreak: 6,
      },
    });
  });

  it('clears server streak insurance after the next resolved round', () => {
    expect(
      shouldClearServerStreakInsurance(true, [
        {
          eventId: 'round-1',
          eventType: 'round-resolved',
          occurredAt: '2026-04-06T10:00:00.000Z',
          payload: {
            mode: 'classic',
            isCorrect: true,
            streakProtected: false,
          },
        },
      ])
    ).toBe(true);

    expect(shouldClearServerStreakInsurance(true, [])).toBe(false);
    expect(
      shouldClearServerStreakInsurance(false, [
        {
          eventId: 'round-2',
          eventType: 'round-resolved',
          occurredAt: '2026-04-06T10:01:00.000Z',
          payload: {
            mode: 'classic',
            isCorrect: false,
            streakProtected: true,
          },
        },
      ])
    ).toBe(false);
  });
});