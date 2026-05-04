import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/env', () => ({
  hasSupabaseEnv: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: vi.fn(),
  createSupabaseAuthClient: vi.fn(),
  createSupabaseServerClient: vi.fn(),
}));

import { hasSupabaseEnv } from '@/lib/supabase/env';
import { createSupabaseAdminClient, createSupabaseAuthClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { POST, shouldClearServerStreakInsurance } from './route';

const mockedHasSupabaseEnv = vi.mocked(hasSupabaseEnv);
const mockedCreateSupabaseAdminClient = vi.mocked(createSupabaseAdminClient);
const mockedCreateSupabaseAuthClient = vi.mocked(createSupabaseAuthClient);
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
    vi.unstubAllEnvs();
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

  it('saves avatar fake bird for authenticated users', async () => {
    mockedHasSupabaseEnv.mockReturnValue(true);
    mockAuthenticatedUser();

    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });

    mockedCreateSupabaseAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return { update };
        }

        return {
          select: vi.fn(),
        };
      }),
    } as never);

    const response = await POST(
      new Request('http://localhost/api/auth', {
        method: 'POST',
        body: JSON.stringify({ action: 'save-avatar-fake-bird', fakeBirdKey: 'spicy-mustard-pelican' }),
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ avatar_fake_bird_key: 'spicy-mustard-pelican' });
    expect(eq).toHaveBeenCalledWith('user_id', 'user-1');
    await expect(response.json()).resolves.toEqual({
      action: 'save-avatar-fake-bird',
      avatarFakeBirdKey: 'spicy-mustard-pelican',
    });
  });

  it('falls back to user metadata when save-avatar-fake-bird column is unavailable', async () => {
    mockedHasSupabaseEnv.mockReturnValue(true);
    mockedCreateSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-1',
              email: 'bird@example.com',
              user_metadata: { requested_username: 'BirdFan_17' },
            },
          },
          error: null,
        }),
      },
    } as never);

    const updateUserById = vi.fn().mockResolvedValue({ error: null });

    mockedCreateSupabaseAdminClient.mockReturnValue({
      auth: {
        admin: {
          updateUserById,
        },
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                error: { code: '42703', message: 'column profiles.avatar_fake_bird_key does not exist' },
              }),
            }),
          };
        }

        return {
          select: vi.fn(),
        };
      }),
    } as never);

    const response = await POST(
      new Request('http://localhost/api/auth', {
        method: 'POST',
        body: JSON.stringify({ action: 'save-avatar-fake-bird', fakeBirdKey: 'spicy-mustard-pelican' }),
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );

    expect(response.status).toBe(200);
    expect(updateUserById).toHaveBeenCalledWith('user-1', {
      user_metadata: {
        requested_username: 'BirdFan_17',
        avatar_fake_bird_key: 'spicy-mustard-pelican',
      },
    });
    await expect(response.json()).resolves.toEqual({
      action: 'save-avatar-fake-bird',
      avatarFakeBirdKey: 'spicy-mustard-pelican',
    });
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

  it('registers an account with username and password in one server-side flow', async () => {
    mockedHasSupabaseEnv.mockReturnValue(true);
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('123');

    const createUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'u_123@accounts.realfakebirds.invalid',
          user_metadata: {
            requested_username: 'BirdFan_17',
            requested_username_canonical: 'birdfan_17',
            account_email_kind: 'placeholder',
          },
        },
      },
      error: null,
    });
    const deleteUser = vi.fn().mockResolvedValue({ error: null });
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
        },
      },
      error: null,
    });

    mockedCreateSupabaseAdminClient.mockReturnValue({
      auth: {
        admin: {
          createUser,
          deleteUser,
        },
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          const availabilityQuery = {
            limit: vi.fn().mockReturnThis(),
            neq: vi.fn().mockResolvedValue({ count: 0, error: null }),
          };

          return {
            select: vi.fn((columns: string, options?: { count?: string; head?: boolean }) => {
              if (options?.count === 'exact' && options.head === true) {
                return {
                  eq: vi.fn().mockReturnValue(availabilityQuery),
                };
              }

              return {
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              };
            }),
            upsert: vi.fn().mockReturnValue({
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
            }),
          };
        }

        if (table === 'leaderboard_stats') {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null }),
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
    mockedCreateSupabaseAuthClient.mockReturnValue({
      auth: {
        signInWithPassword,
      },
    } as never);

    const response = await POST(
      new Request('http://localhost/api/auth', {
        method: 'POST',
        body: JSON.stringify({
          action: 'register-account',
          username: 'BirdFan_17',
          password: 'secret-password',
        }),
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );

    expect(response.status).toBe(200);
    expect(createUser).toHaveBeenCalledWith({
      email: 'u_123@accounts.realfakebirds.invalid',
      password: 'secret-password',
      email_confirm: true,
      user_metadata: {
        requested_username: 'BirdFan_17',
        requested_username_canonical: 'birdfan_17',
        account_email_kind: 'placeholder',
      },
    });
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'u_123@accounts.realfakebirds.invalid',
      password: 'secret-password',
    });
    expect(deleteUser).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      action: 'register-account',
      account: {
        email: null,
        username: 'BirdFan_17',
        usernameCanonical: 'birdfan_17',
      },
      requiresEmailVerification: false,
      session: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    });
  });

  it('requires a captcha token when Turnstile verification is configured', async () => {
    mockedHasSupabaseEnv.mockReturnValue(true);
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'test-secret');
    const createUser = vi.fn();

    mockedCreateSupabaseAdminClient.mockReturnValue({
      auth: {
        admin: {
          createUser,
        },
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        }),
      })),
    } as never);

    const response = await POST(
      new Request('http://localhost/api/auth', {
        method: 'POST',
        body: JSON.stringify({
          action: 'register-account',
          username: 'BirdFan_17',
          password: 'secret-password',
        }),
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );

    expect(response.status).toBe(400);
    expect(createUser).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: 'captcha_required',
      message: 'Complete the quick human check and try again.',
    });
  });

  it('signs in with a username without returning the backing email', async () => {
    mockedHasSupabaseEnv.mockReturnValue(true);

    const signInWithPassword = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
        },
      },
      error: null,
    });

    mockedCreateSupabaseAdminClient.mockReturnValue({
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({
            data: { user: { email: 'bird@example.com' } },
            error: null,
          }),
        },
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: 'user-1' } }),
          }),
        }),
      })),
    } as never);
    mockedCreateSupabaseAuthClient.mockReturnValue({
      auth: {
        signInWithPassword,
      },
    } as never);

    const response = await POST(
      new Request('http://localhost/api/auth', {
        method: 'POST',
        body: JSON.stringify({
          action: 'sign-in-with-username',
          username: 'BirdFan_17',
          password: 'secret-password',
        }),
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );

    expect(response.status).toBe(200);
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'bird@example.com',
      password: 'secret-password',
    });
    await expect(response.json()).resolves.toEqual({
      action: 'sign-in-with-username',
      session: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    });
  });

  it('returns email confirmation required when username sign-in hits an unverified account', async () => {
    mockedHasSupabaseEnv.mockReturnValue(true);

    mockedCreateSupabaseAdminClient.mockReturnValue({
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({
            data: { user: { email: 'bird@example.com' } },
            error: null,
          }),
        },
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: 'user-1' } }),
          }),
        }),
      })),
    } as never);
    mockedCreateSupabaseAuthClient.mockReturnValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { session: null },
          error: { message: 'Email not confirmed' },
        }),
      },
    } as never);

    const response = await POST(
      new Request('http://localhost/api/auth', {
        method: 'POST',
        body: JSON.stringify({
          action: 'sign-in-with-username',
          username: 'BirdFan_17',
          password: 'secret-password',
        }),
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'email_confirmation_required' });
  });

  it('keeps account state available when avatar_fake_bird_key is not selectable yet', async () => {
    mockedHasSupabaseEnv.mockReturnValue(true);
    mockedCreateSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-1',
              email: 'bird@example.com',
              user_metadata: { avatar_fake_bird_key: 'spicy-mustard-pelican' },
            },
          },
          error: null,
        }),
      },
    } as never);

    const profileSelect = vi.fn((columns: string) => {
      if (columns === 'username, username_canonical, avatar_palette') {
        return {
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                username: 'BirdFan_17',
                username_canonical: 'birdfan_17',
                avatar_palette: 'finch',
              },
              error: null,
            }),
          }),
        };
      }

      if (columns === 'username, username_canonical, avatar_palette, is_house_account, created_at, avatar_fake_bird_key') {
        return {
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: {
                code: '42703',
                message: 'column profiles.avatar_fake_bird_key does not exist',
              },
            }),
          }),
        };
      }

      if (columns === 'username, username_canonical, avatar_palette, is_house_account, created_at') {
        return {
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                username: 'BirdFan_17',
                username_canonical: 'birdfan_17',
                avatar_palette: 'finch',
                is_house_account: false,
                created_at: '2026-04-03T12:00:00.000Z',
              },
              error: null,
            }),
          }),
        };
      }

      return {
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };
    });

    const leaderboardSelect = vi.fn((columns: string) => {
      if (columns.includes('previous_week_finalized_at')) {
        return {
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      }

      return {
        not: vi.fn().mockReturnValue({
          lt: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });

    mockedCreateSupabaseAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: profileSelect,
          };
        }

        if (table === 'player_progress') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    last_local_sync_at: null,
                    birds_identified: 12,
                    seeds: 34,
                    best_streak: 5,
                    best_daily_streak: 3,
                    best_weekly_placement: null,
                    first_place_count: 0,
                    second_place_count: 0,
                    third_place_count: 0,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'unlocked_themes') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }

        if (table === 'leaderboard_stats') {
          return {
            select: leaderboardSelect,
            upsert: vi.fn().mockResolvedValue({ error: null }),
          };
        }

        return {
          select: vi.fn(),
        };
      }),
    } as never);

    const response = await POST(
      new Request('http://localhost/api/auth', {
        method: 'POST',
        body: JSON.stringify({ action: 'get-account-state' }),
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      action: 'get-account-state',
      email: 'bird@example.com',
      profile: {
        username: 'BirdFan_17',
        usernameCanonical: 'birdfan_17',
        avatarPalette: 'finch',
        isHouseAccount: false,
        joinedMonthYear: 'April 2026',
        avatarFakeBirdKey: 'spicy-mustard-pelican',
      },
    });
  });

  it('rejects oversized progress event batches before auth work begins', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth', {
        method: 'POST',
        body: JSON.stringify({
          action: 'apply-progress-events',
          events: Array.from({ length: 501 }, (_, index) => ({ eventId: `e${index}` })),
        }),
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'invalid_request',
      message: 'Progress event batches may not exceed 500 events.',
    });
  });

  it('rejects oversized journal sync payloads before auth work begins', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth', {
        method: 'POST',
        body: JSON.stringify({
          action: 'sync-local-progress',
          progress: {
            score: null,
            unlockedThemes: [],
            dailyChallengeHistory: [],
            dailyMissionHistory: [],
            milestones: [],
            journalEntries: Array.from({ length: 10_001 }, (_, index) => ({ birdKey: `real:bird-${index}` })),
            birdhouse: { real: [], fake: [], updatedAt: '2026-01-01T00:00:00.000Z' },
          },
        }),
        headers: { 'Content-Type': 'application/json' },
      }) as never
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'invalid_request',
      message: 'Journal sync payloads may not exceed 10,000 entries.',
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

  describe('weekly leaderboard rollover', () => {
    const STALE_WEEK_START = '2020-01-06';

    const staleLeaderboardRow = {
      user_id: 'user-1',
      username_canonical: null,
      current_week_start: STALE_WEEK_START,
      weekly_birds_seen: 0,
      weekly_birds_identified: 0,
      weekly_seeds_earned: 0,
      weekly_best_streak: 0,
      weekly_new_birds_discovered: 0,
      weekly_fake_birds_identified: 0,
      weekly_real_birds_identified: 0,
      weekly_unique_birds_seen: 0,
      weekly_seen_bird_keys: [],
    };

    const minimalProgressBody = {
      action: 'sync-local-progress',
      progress: {
        score: { birdsSeen: 0, birdsIdentified: 0, currentStreak: 0, bestStreak: 0, currentDailyStreak: 0, bestDailyStreak: 0, seeds: 0 },
        unlockedThemes: [],
        milestones: [],
        dailyChallengeHistory: [],
        dailyMissionHistory: [],
        journalEntries: [],
        birdhouse: { real: [], fake: [], updatedAt: '2020-01-01T00:00:00.000Z' },
      },
    };

    it('finalization update uses .lt guard so the reset cannot be silently skipped', async () => {
      mockedHasSupabaseEnv.mockReturnValue(true);
      mockAuthenticatedUser();

      const finalizationUpdateLt = vi.fn().mockResolvedValue({ count: 1, error: null });
      const finalizationUpdateEq = vi.fn().mockReturnValue({ lt: finalizationUpdateLt });
      const safetyNetLt = vi.fn().mockResolvedValue({ count: 0, error: null });
      const safetyNetEq = vi.fn().mockReturnValue({ lt: safetyNetLt });

      const leaderboardUpdate = vi.fn()
        .mockReturnValueOnce({ eq: finalizationUpdateEq }) // finalization
        .mockReturnValueOnce({ eq: safetyNetEq });         // safety net

      mockedCreateSupabaseAdminClient.mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'leaderboard_stats') {
            return {
              select: vi.fn().mockReturnValue({
                not: vi.fn().mockReturnValue({
                  lt: vi.fn().mockResolvedValue({ data: [staleLeaderboardRow] }),
                }),
              }),
              update: leaderboardUpdate,
              upsert: vi.fn().mockResolvedValue({ error: null }),
            };
          }

          if (table === 'player_progress') {
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({ data: [] }),
              }),
              upsert: vi.fn().mockResolvedValue({ error: null }),
            };
          }

          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                }),
              }),
            };
          }

          if (table === 'birdhouse') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
              upsert: vi.fn().mockResolvedValue({ error: null }),
            };
          }

          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
            upsert: vi.fn().mockResolvedValue({ error: null }),
          };
        }),
      } as never);

      const response = await POST(
        new Request('http://localhost/api/auth', {
          method: 'POST',
          body: JSON.stringify(minimalProgressBody),
          headers: { 'Content-Type': 'application/json' },
        }) as never
      );

      expect(response.status).toBe(200);

      // Finalization: update includes previous_week_start and reset weekly fields
      expect(leaderboardUpdate).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          current_week_start: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          weekly_birds_seen: 0,
          weekly_seen_bird_keys: [],
          previous_week_start: STALE_WEEK_START,
          previous_week_participated: false,
        }),
        { count: 'exact' }
      );

      // Finalization update uses .lt not .eq so it cannot silently miss a row
      // that was already advanced to the new week by another write path
      expect(finalizationUpdateEq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(finalizationUpdateLt).toHaveBeenCalledWith(
        'current_week_start',
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
      );

      // Safety-net update fires and also uses .lt
      expect(leaderboardUpdate).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ weekly_birds_seen: 0, weekly_seen_bird_keys: [] })
      );
      expect(safetyNetEq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(safetyNetLt).toHaveBeenCalledWith(
        'current_week_start',
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
      );
    });

    it('sync-local-progress fires safety-net weekly reset even when finalization found no stale rows', async () => {
      mockedHasSupabaseEnv.mockReturnValue(true);
      mockAuthenticatedUser();

      const safetyNetLt = vi.fn().mockResolvedValue({ count: 0, error: null });
      const safetyNetEq = vi.fn().mockReturnValue({ lt: safetyNetLt });
      const leaderboardUpdate = vi.fn().mockReturnValue({ eq: safetyNetEq });

      mockedCreateSupabaseAdminClient.mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'leaderboard_stats') {
            return {
              select: vi.fn().mockReturnValue({
                not: vi.fn().mockReturnValue({
                  lt: vi.fn().mockResolvedValue({ data: [] }), // no stale rows
                }),
              }),
              update: leaderboardUpdate,
              upsert: vi.fn().mockResolvedValue({ error: null }),
            };
          }

          if (table === 'player_progress') {
            return { upsert: vi.fn().mockResolvedValue({ error: null }) };
          }

          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                }),
              }),
            };
          }

          if (table === 'birdhouse') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
              upsert: vi.fn().mockResolvedValue({ error: null }),
            };
          }

          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
            upsert: vi.fn().mockResolvedValue({ error: null }),
          };
        }),
      } as never);

      const response = await POST(
        new Request('http://localhost/api/auth', {
          method: 'POST',
          body: JSON.stringify(minimalProgressBody),
          headers: { 'Content-Type': 'application/json' },
        }) as never
      );

      expect(response.status).toBe(200);

      // Safety-net update is always issued, even when finalization had nothing to do
      expect(leaderboardUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ weekly_birds_seen: 0, weekly_seen_bird_keys: [] })
      );
      expect(safetyNetEq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(safetyNetLt).toHaveBeenCalledWith(
        'current_week_start',
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
      );

      // The safety-net update (not the finalization update) is the only leaderboard update call
      expect(leaderboardUpdate).toHaveBeenCalledTimes(1);
    });
  });
});