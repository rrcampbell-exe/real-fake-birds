import { describe, expect, it, vi } from 'vitest';
import { ensureAccountProfileFromUserMetadata } from './account-profile';
import type { SupabaseClient, User } from '@supabase/supabase-js';

vi.mock('@/lib/utils/weekly-leaderboard', () => ({
  getCurrentWeekStart: () => '2026-01-06',
}));

function makeAdmin(overrides: Record<string, unknown> = {}): SupabaseClient {
  const base = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    upsert: vi.fn().mockReturnThis(),
    ...overrides,
  };
  return base as unknown as SupabaseClient;
}

function makeUser(metadata: Record<string, unknown> = {}): User {
  return {
    id: 'user-123',
    user_metadata: metadata,
  } as unknown as User;
}

describe('ensureAccountProfileFromUserMetadata', () => {
  it('returns error when fetching the existing profile fails', async () => {
    const admin = makeAdmin();
    (admin.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } }),
    });

    const result = await ensureAccountProfileFromUserMetadata({ admin, user: makeUser() });
    expect(result.status).toBe('error');
    expect(result.profile).toBeNull();
  });

  it('returns existing status when profile already has a username and leaderboard upsert succeeds', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    const admin = makeAdmin();
    let callCount = 0;
    (admin.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { username: 'birder', username_canonical: 'birder', avatar_palette: 'finch' },
            error: null,
          }),
        };
      }
      return { upsert: upsertMock };
    });

    const result = await ensureAccountProfileFromUserMetadata({
      admin,
      user: makeUser({ requested_username: 'birder' }),
    });

    expect(result.status).toBe('existing');
    expect(result.profile?.username).toBe('birder');
  });

  it('returns error when existing profile leaderboard upsert fails', async () => {
    const admin = makeAdmin();
    let callCount = 0;
    (admin.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { username: 'birder', username_canonical: 'birder', avatar_palette: 'finch' },
            error: null,
          }),
        };
      }
      return {
        upsert: vi.fn().mockResolvedValue({ error: { message: 'leaderboard error' } }),
      };
    });

    const result = await ensureAccountProfileFromUserMetadata({
      admin,
      user: makeUser({ requested_username: 'birder' }),
    });

    expect(result.status).toBe('error');
    expect(result.profile).toBeNull();
  });

  it('returns missing_username when user metadata has no requested_username', async () => {
    const admin = makeAdmin();
    (admin.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const result = await ensureAccountProfileFromUserMetadata({ admin, user: makeUser() });
    expect(result.status).toBe('missing_username');
  });
});
