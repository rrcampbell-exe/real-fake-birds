import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildSocialEntries,
  buildSocialEntriesByUserId,
} from './social-entries';

function buildAdmin(options?: {
  profilesData?: Array<Record<string, unknown>>;
  profilesError?: unknown;
  fallbackProfilesData?: Array<Record<string, unknown>>;
  progressData?: Array<Record<string, unknown>>;
  followData?: Array<Record<string, unknown>>;
  outgoingBlocksData?: Array<Record<string, unknown>>;
  incomingBlocksData?: Array<Record<string, unknown>>;
  followError?: unknown;
  outgoingBlockError?: unknown;
  incomingBlockError?: unknown;
}) {
  let profileQueryCount = 0;

  return {
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockImplementation(() => {
            profileQueryCount += 1;
            if (profileQueryCount === 1) {
              return Promise.resolve({
                data: options?.profilesData ?? [],
                error: options?.profilesError ?? null,
              });
            }

            return Promise.resolve({
              data: options?.fallbackProfilesData ?? [],
              error: null,
            });
          }),
        };
      }

      if (table === 'player_progress') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: options?.progressData ?? [],
            error: null,
          }),
        };
      }

      if (table === 'follows') {
        const state: Record<string, unknown> = {};
        return {
          select: vi.fn().mockReturnThis(),
          eq(field: string, value: unknown) {
            state[field] = value;
            return this;
          },
          in: vi.fn().mockImplementation(() => {
            if (state.relationship_type === 'follow') {
              return Promise.resolve({
                data: options?.followData ?? [],
                error: options?.followError ?? null,
              });
            }

            if (state.relationship_type === 'block' && state.user_id) {
              return Promise.resolve({
                data: options?.outgoingBlocksData ?? [],
                error: options?.outgoingBlockError ?? null,
              });
            }

            return Promise.resolve({
              data: options?.incomingBlocksData ?? [],
              error: options?.incomingBlockError ?? null,
            });
          }),
        };
      }

      throw new Error(`unexpected table ${table}`);
    }),
  };
}

afterEach(() => {
  delete process.env.CDN_BASE_URL;
});

describe('social-entries', () => {
  it('returns no entries for an empty input set', async () => {
    const admin = buildAdmin();

    await expect(buildSocialEntriesByUserId(admin as never, [], 'viewer')).resolves.toEqual(new Map());
    expect(admin.from).not.toHaveBeenCalled();
  });

  it('filters blocked users and derives relationships and capabilities', async () => {
    process.env.CDN_BASE_URL = 'https://cdn.example.com';

    const admin = buildAdmin({
      profilesData: [
        {
          user_id: 'following',
          username: 'following-user',
          avatar_palette: 'finch',
          avatar_fake_bird_key: 'fake:roseate-spoonbill',
          is_house_account: false,
        },
        {
          user_id: 'requested',
          username: 'requested-user',
          avatar_palette: null,
          avatar_fake_bird_key: null,
          is_house_account: false,
        },
        {
          user_id: 'blocked-out',
          username: 'blocked-out-user',
          avatar_palette: 'finch',
          avatar_fake_bird_key: null,
          is_house_account: false,
        },
        {
          user_id: 'blocked-in',
          username: 'blocked-in-user',
          avatar_palette: 'finch',
          avatar_fake_bird_key: null,
          is_house_account: false,
        },
        {
          user_id: 'house',
          username: 'house-user',
          avatar_palette: 'owl',
          avatar_fake_bird_key: null,
          is_house_account: true,
        },
      ],
      progressData: [
        { user_id: 'following', birds_identified: 500 },
        { user_id: 'requested', birds_identified: 0 },
        { user_id: 'blocked-out', birds_identified: 99 },
        { user_id: 'blocked-in', birds_identified: 99 },
        { user_id: 'house', birds_identified: 500 },
      ],
      followData: [
        { related_user_id: 'following', status: 'approved' },
        { related_user_id: 'requested', status: 'pending' },
      ],
      outgoingBlocksData: [{ related_user_id: 'blocked-out' }],
      incomingBlocksData: [{ user_id: 'blocked-in' }],
    });

    const entries = await buildSocialEntries(
      admin as never,
      ['blocked-out', 'following', 'requested', 'blocked-in', 'house', 'following'],
      'viewer',
    );

    expect(entries.map((entry) => entry.userId)).toEqual(['following', 'requested', 'house', 'following']);
    expect(entries[0]).toMatchObject({
      userId: 'following',
      relationship: 'following',
      capabilities: {
        canFollow: false,
        canUnfollow: true,
      },
    });
    expect(entries[0]?.avatarFakeBirdImageUrl).toContain('/birds/fake/roseate-spoonbill/thumb.webp');
    expect(entries[0]?.latestBadgeName).not.toBeNull();

    expect(entries[1]).toMatchObject({
      userId: 'requested',
      avatarPalette: 'finch',
      relationship: 'requested',
      capabilities: {
        canFollow: false,
        canUnfollow: false,
      },
    });

    expect(entries[2]).toMatchObject({
      userId: 'house',
      relationship: 'none',
      latestBadgeName: null,
      capabilities: {
        canFollow: true,
        canUnfollow: false,
      },
    });
  });

  it('keeps viewer-blocked users in results when explicitly requested, but still filters blockers', async () => {
    const admin = buildAdmin({
      profilesData: [
        {
          user_id: 'blocked-out',
          username: 'blocked-out-user',
          avatar_palette: 'finch',
          avatar_fake_bird_key: null,
          is_house_account: false,
        },
        {
          user_id: 'blocked-in',
          username: 'blocked-in-user',
          avatar_palette: 'finch',
          avatar_fake_bird_key: null,
          is_house_account: false,
        },
      ],
      progressData: [
        { user_id: 'blocked-out', birds_identified: 5 },
        { user_id: 'blocked-in', birds_identified: 5 },
      ],
      outgoingBlocksData: [{ related_user_id: 'blocked-out' }],
      incomingBlocksData: [{ user_id: 'blocked-in' }],
    });

    const entries = await buildSocialEntries(
      admin as never,
      ['blocked-out', 'blocked-in'],
      'viewer',
      { includeBlockedByViewer: true },
    );

    expect(entries.map((entry) => entry.userId)).toEqual(['blocked-out']);
    expect(entries[0]).toMatchObject({
      userId: 'blocked-out',
      relationship: 'none',
      capabilities: {
        canFollow: false,
        canUnfollow: false,
      },
    });
  });

  it('falls back when profile avatar columns are unavailable', async () => {
    const admin = buildAdmin({
      profilesError: {
        code: 'PGRST204',
        message: 'Could not find the avatar_fake_bird_key column of profiles in schema cache',
      },
      fallbackProfilesData: [
        {
          user_id: 'target',
          username: 'target-user',
          avatar_palette: null,
        },
      ],
      progressData: [{ user_id: 'target', birds_identified: 0 }],
    });

    const entries = await buildSocialEntries(admin as never, ['target'], null);
    expect(entries).toEqual([
      expect.objectContaining({
        userId: 'target',
        avatarPalette: 'finch',
        avatarFakeBirdImageUrl: null,
        isHouseAccount: false,
      }),
    ]);
  });

  it('throws when relationship queries fail', async () => {
    const admin = buildAdmin({
      profilesData: [{ user_id: 'target', username: 'target-user', avatar_palette: 'finch' }],
      progressData: [{ user_id: 'target', birds_identified: 0 }],
      outgoingBlockError: new Error('block fetch failed'),
    });

    await expect(buildSocialEntries(admin as never, ['target'], 'viewer')).rejects.toThrow(
      'block fetch failed',
    );
  });
});
