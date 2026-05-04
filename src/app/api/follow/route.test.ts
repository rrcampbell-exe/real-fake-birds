import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock server-only modules before importing the route
vi.mock('@/lib/supabase/env', () => ({
  hasSupabaseEnv: vi.fn().mockReturnValue(true),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: vi.fn(),
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/server/rate-limiter', () => ({
  getRateLimitKey: vi.fn().mockReturnValue('test-key'),
  consumeRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

import { NextRequest } from 'next/server';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { POST } from './route';

const mockedAdminClient = vi.mocked(createSupabaseAdminClient);
const mockedServerClient = vi.mocked(createSupabaseServerClient);

function buildRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/follow', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function buildMockAdmin({
  targetProfile = null,
  existingFollows = [],
  insertError = null,
  updateError = null,
  deleteError = null,
}: {
  targetProfile?: { user_id: string; privacy_mode: 'public' | 'private' } | null;
  existingFollows?: unknown[];
  insertError?: unknown | null;
  updateError?: unknown | null;
  deleteError?: unknown | null;
}) {
  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: targetProfile, error: null }),
        };
      }

      if (table === 'follows') {
        return {
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockResolvedValue({ data: existingFollows, error: null }),
          insert: vi.fn().mockResolvedValue({ error: insertError }),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi
            .fn()
            .mockReturnThis(),
        };
      }

      return {};
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  // Default: authenticated user
  mockedServerClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'viewer-uid' } },
        error: null,
      }),
    },
  } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);
});

describe('POST /api/follow', () => {
  it('returns 401 when user is not authenticated', async () => {
    mockedServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

    const request = buildRequest({ action: 'request', targetUsername: 'target' });
    const response = await POST(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('unauthenticated');
  });

  it('returns 400 for missing action', async () => {
    const request = buildRequest({ targetUsername: 'target' });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('invalid_request_body');
  });

  it('returns 400 for missing target', async () => {
    const request = buildRequest({ action: 'request' });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('invalid_request_body');
  });

  it('returns 400 when user tries to follow themselves', async () => {
    mockedAdminClient.mockReturnValue(
      buildMockAdmin({
        targetProfile: { user_id: 'viewer-uid', privacy_mode: 'public' },
      }) as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const request = buildRequest({ action: 'request', targetUsername: 'viewer' });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('cannot_self_action');
  });

  it('returns 404 when target user does not exist', async () => {
    mockedAdminClient.mockReturnValue(
      buildMockAdmin({ targetProfile: null }) as unknown as ReturnType<
        typeof createSupabaseAdminClient
      >,
    );

    const request = buildRequest({ action: 'request', targetUsername: 'unknown' });
    const response = await POST(request);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('target_not_found');
  });

  it('returns 403 when users are blocked', async () => {
    mockedAdminClient.mockReturnValue(
      buildMockAdmin({
        targetProfile: { user_id: 'target-uid', privacy_mode: 'public' },
        existingFollows: [
          {
            user_id: 'target-uid',
            related_user_id: 'viewer-uid',
            relationship_type: 'block',
            status: 'approved',
          },
        ],
      }) as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const request = buildRequest({ action: 'request', targetUsername: 'target' });
    const response = await POST(request);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('blocked');
  });

  describe('follow request action', () => {
    it('returns 409 when already following public profile', async () => {
      mockedAdminClient.mockReturnValue(
        buildMockAdmin({
          targetProfile: { user_id: 'target-uid', privacy_mode: 'public' },
          existingFollows: [
            {
              user_id: 'viewer-uid',
              related_user_id: 'target-uid',
              relationship_type: 'follow',
              status: 'approved',
            },
          ],
        }) as unknown as ReturnType<typeof createSupabaseAdminClient>,
      );

      const request = buildRequest({ action: 'request', targetUsername: 'target' });
      const response = await POST(request);

      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body.error).toBe('already_following');
    });

    it('returns 409 when request already sent to private profile', async () => {
      mockedAdminClient.mockReturnValue(
        buildMockAdmin({
          targetProfile: { user_id: 'target-uid', privacy_mode: 'private' },
          existingFollows: [
            {
              user_id: 'viewer-uid',
              related_user_id: 'target-uid',
              relationship_type: 'follow',
              status: 'pending',
            },
          ],
        }) as unknown as ReturnType<typeof createSupabaseAdminClient>,
      );

      const request = buildRequest({ action: 'request', targetUsername: 'target' });
      const response = await POST(request);

      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body.error).toBe('request_already_sent');
    });

    it('auto-accepts follow for public profile', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      mockedAdminClient.mockReturnValue({
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi
                .fn()
                .mockResolvedValue({
                  data: { user_id: 'target-uid', privacy_mode: 'public' },
                  error: null,
                }),
            };
          }
          if (table === 'follows') {
            return {
              select: vi.fn().mockReturnThis(),
              or: vi.fn().mockResolvedValue({ data: [], error: null }),
              insert: insertMock,
            };
          }
          return {};
        }),
      } as unknown as ReturnType<typeof createSupabaseAdminClient>);

      const request = buildRequest({ action: 'request', targetUsername: 'target' });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.ok).toBe(true);
      expect(body.relationship).toBe('following');
      expect(insertMock).toHaveBeenCalledWith([
        expect.objectContaining({
          user_id: 'viewer-uid',
          related_user_id: 'target-uid',
          relationship_type: 'follow',
          status: 'approved',
        }),
      ]);
    });

    it('creates pending request for private profile', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      mockedAdminClient.mockReturnValue({
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi
                .fn()
                .mockResolvedValue({
                  data: { user_id: 'target-uid', privacy_mode: 'private' },
                  error: null,
                }),
            };
          }
          if (table === 'follows') {
            return {
              select: vi.fn().mockReturnThis(),
              or: vi.fn().mockResolvedValue({ data: [], error: null }),
              insert: insertMock,
            };
          }
          return {};
        }),
      } as unknown as ReturnType<typeof createSupabaseAdminClient>);

      const request = buildRequest({ action: 'request', targetUsername: 'target' });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.ok).toBe(true);
      expect(body.relationship).toBe('requested');
      expect(insertMock).toHaveBeenCalledWith([
        expect.objectContaining({
          user_id: 'viewer-uid',
          related_user_id: 'target-uid',
          relationship_type: 'follow',
          status: 'pending',
        }),
      ]);
    });

    it('returns success on duplicate insert (idempotent)', async () => {
      mockedAdminClient.mockReturnValue({
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi
                .fn()
                .mockResolvedValue({
                  data: { user_id: 'target-uid', privacy_mode: 'public' },
                  error: null,
                }),
            };
          }
          if (table === 'follows') {
            return {
              select: vi.fn().mockReturnThis(),
              or: vi.fn().mockResolvedValue({ data: [], error: null }),
              insert: vi.fn().mockResolvedValue({ error: { code: '23505' } }),
            };
          }
          return {};
        }),
      } as unknown as ReturnType<typeof createSupabaseAdminClient>);

      const request = buildRequest({ action: 'request', targetUsername: 'target' });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.ok).toBe(true);
    });
  });

  describe('approve action', () => {
    it('approves pending follow request', async () => {
      const updateMock = vi.fn().mockReturnThis();
      mockedAdminClient.mockReturnValue({
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi
                .fn()
                .mockResolvedValue({
                  data: { user_id: 'requester-uid', privacy_mode: 'private' },
                  error: null,
                }),
            };
          }
          if (table === 'follows') {
            return {
              select: vi.fn().mockReturnThis(),
              or: vi.fn().mockResolvedValue({
                data: [
                  {
                    user_id: 'requester-uid',
                    related_user_id: 'viewer-uid',
                    relationship_type: 'follow',
                    status: 'pending',
                  },
                ],
                error: null,
              }),
              update: updateMock,
              eq: vi.fn().mockReturnThis(),
            };
          }
          return {};
        }),
      } as unknown as ReturnType<typeof createSupabaseAdminClient>);

      const request = buildRequest({ action: 'approve', targetUsername: 'requester' });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.ok).toBe(true);
    });

    it('returns 404 when no pending request exists', async () => {
      mockedAdminClient.mockReturnValue(
        buildMockAdmin({
          targetProfile: { user_id: 'target-uid', privacy_mode: 'private' },
          existingFollows: [],
        }) as unknown as ReturnType<typeof createSupabaseAdminClient>,
      );

      const request = buildRequest({ action: 'approve', targetUsername: 'target' });
      const response = await POST(request);

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('no_pending_request');
    });
  });

  describe('deny action', () => {
    it('denies pending follow request', async () => {
      const deleteMock = vi.fn().mockReturnThis();
      mockedAdminClient.mockReturnValue({
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi
                .fn()
                .mockResolvedValue({
                  data: { user_id: 'requester-uid', privacy_mode: 'private' },
                  error: null,
                }),
            };
          }
          if (table === 'follows') {
            return {
              select: vi.fn().mockReturnThis(),
              or: vi.fn().mockResolvedValue({
                data: [
                  {
                    user_id: 'requester-uid',
                    related_user_id: 'viewer-uid',
                    relationship_type: 'follow',
                    status: 'pending',
                  },
                ],
                error: null,
              }),
              delete: deleteMock,
              eq: vi.fn().mockReturnThis(),
            };
          }
          return {};
        }),
      } as unknown as ReturnType<typeof createSupabaseAdminClient>);

      const request = buildRequest({ action: 'deny', targetUsername: 'requester' });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.ok).toBe(true);
    });

    it('returns 404 when no pending request exists', async () => {
      mockedAdminClient.mockReturnValue(
        buildMockAdmin({
          targetProfile: { user_id: 'target-uid', privacy_mode: 'private' },
          existingFollows: [],
        }) as unknown as ReturnType<typeof createSupabaseAdminClient>,
      );

      const request = buildRequest({ action: 'deny', targetUsername: 'target' });
      const response = await POST(request);

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('no_pending_request');
    });
  });

  describe('unfollow action', () => {
    it('unfollows an approved follow', async () => {
      const deleteMock = vi.fn().mockReturnThis();
      mockedAdminClient.mockReturnValue({
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi
                .fn()
                .mockResolvedValue({
                  data: { user_id: 'target-uid', privacy_mode: 'public' },
                  error: null,
                }),
            };
          }
          if (table === 'follows') {
            return {
              select: vi.fn().mockReturnThis(),
              or: vi.fn().mockResolvedValue({
                data: [
                  {
                    user_id: 'viewer-uid',
                    related_user_id: 'target-uid',
                    relationship_type: 'follow',
                    status: 'approved',
                  },
                ],
                error: null,
              }),
              delete: deleteMock,
              eq: vi.fn().mockReturnThis(),
            };
          }
          return {};
        }),
      } as unknown as ReturnType<typeof createSupabaseAdminClient>);

      const request = buildRequest({ action: 'unfollow', targetUsername: 'target' });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.ok).toBe(true);
    });

    it('returns 404 when not following', async () => {
      mockedAdminClient.mockReturnValue(
        buildMockAdmin({
          targetProfile: { user_id: 'target-uid', privacy_mode: 'public' },
          existingFollows: [],
        }) as unknown as ReturnType<typeof createSupabaseAdminClient>,
      );

      const request = buildRequest({ action: 'unfollow', targetUsername: 'target' });
      const response = await POST(request);

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('not_following');
    });
  });
});
