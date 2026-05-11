import { describe, expect, it, vi } from 'vitest';
import {
  clearConflictingFollowStates,
  createBlockRelationship,
  fetchRelationshipRows,
  hasApprovedFollow,
  hasBlockRelationship,
  hasPendingFollow,
  removeBlockRelationship,
} from './social-relationships';
import type { FollowRow } from '@/types/profile';

function row(
  userId: string,
  relatedUserId: string,
  relationshipType: 'follow' | 'block',
  status: 'pending' | 'approved',
): FollowRow {
  return { userId, relatedUserId, relationshipType, status };
}

describe('social-relationships', () => {
  it('detects block relationships in either direction', () => {
    expect(
      hasBlockRelationship([row('viewer', 'target', 'block', 'approved')], 'viewer', 'target'),
    ).toBe(true);
    expect(
      hasBlockRelationship([row('target', 'viewer', 'block', 'approved')], 'viewer', 'target'),
    ).toBe(true);
    expect(
      hasBlockRelationship([row('viewer', 'target', 'follow', 'approved')], 'viewer', 'target'),
    ).toBe(false);
  });

  it('detects approved and pending follow states directionally', () => {
    const rows = [
      row('viewer', 'target', 'follow', 'approved'),
      row('other', 'viewer', 'follow', 'pending'),
    ];

    expect(hasApprovedFollow(rows, 'viewer', 'target')).toBe(true);
    expect(hasApprovedFollow(rows, 'target', 'viewer')).toBe(false);
    expect(hasPendingFollow(rows, 'other', 'viewer')).toBe(true);
    expect(hasPendingFollow(rows, 'viewer', 'other')).toBe(false);
  });

  it('fetches and maps relationship rows', async () => {
    const orSpy = vi.fn().mockResolvedValue({
      data: [
        {
          user_id: 'viewer',
          related_user_id: 'target',
          relationship_type: 'follow',
          status: 'approved',
        },
      ],
      error: null,
    });

    const admin = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        or: orSpy,
      }),
    };

    await expect(
      fetchRelationshipRows(admin as never, 'viewer', 'target'),
    ).resolves.toEqual([row('viewer', 'target', 'follow', 'approved')]);
    expect(orSpy).toHaveBeenCalledWith(
      'and(user_id.eq.viewer,related_user_id.eq.target),and(user_id.eq.target,related_user_id.eq.viewer)',
    );
  });

  it('returns no relationship rows when either id is missing', async () => {
    const admin = { from: vi.fn() };
    await expect(fetchRelationshipRows(admin as never, '', 'target')).resolves.toEqual([]);
    expect(admin.from).not.toHaveBeenCalled();
  });

  it('clears conflicting follow states before blocking', async () => {
    const orSpy = vi.fn().mockResolvedValue({ error: null });
    const admin = {
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: orSpy,
      }),
    };

    await expect(clearConflictingFollowStates(admin as never, 'viewer', 'target')).resolves.toBeUndefined();
    expect(orSpy).toHaveBeenCalledWith(
      'and(user_id.eq.viewer,related_user_id.eq.target),and(user_id.eq.target,related_user_id.eq.viewer)',
    );
  });

  it('creates approved block rows and treats duplicates as idempotent', async () => {
    const deleteOrSpy = vi.fn().mockResolvedValue({ error: null });
    const insertSpy = vi
      .fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { code: '23505' } });
    const admin = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table !== 'follows') {
          throw new Error(`unexpected table ${table}`);
        }

        return {
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: deleteOrSpy,
          insert: insertSpy,
        };
      }),
    };

    await expect(createBlockRelationship(admin as never, 'viewer', 'target')).resolves.toEqual({
      created: true,
    });
    await expect(createBlockRelationship(admin as never, 'viewer', 'target')).resolves.toEqual({
      created: false,
    });
    expect(insertSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: 'viewer',
        related_user_id: 'target',
        relationship_type: 'block',
        status: 'approved',
      }),
    ]);
  });

  it('removes block rows idempotently', async () => {
    const eqSpy = vi.fn().mockReturnThis();
    const admin = {
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: eqSpy,
      }),
    };

    await expect(removeBlockRelationship(admin as never, 'viewer', 'target')).resolves.toBeUndefined();
    expect(eqSpy).toHaveBeenCalledTimes(3);
  });
});
