import type { FollowRow } from '@/types/profile';

type AdminClient = ReturnType<typeof import('@/lib/supabase/server').createSupabaseAdminClient>;

type RawFollowRow = {
  user_id: string;
  related_user_id: string;
  relationship_type: 'follow' | 'block';
  status: 'pending' | 'approved';
};

function toFollowRows(rows: RawFollowRow[] | null | undefined): FollowRow[] {
  return (rows ?? []).map((row) => ({
    userId: row.user_id,
    relatedUserId: row.related_user_id,
    relationshipType: row.relationship_type,
    status: row.status,
  }));
}

export function hasBlockRelationship(rows: FollowRow[], userId: string, targetUserId: string): boolean {
  return rows.some(
    (row) =>
      row.relationshipType === 'block'
      && (
        (row.userId === userId && row.relatedUserId === targetUserId)
        || (row.userId === targetUserId && row.relatedUserId === userId)
      ),
  );
}

export function hasApprovedFollow(rows: FollowRow[], userId: string, targetUserId: string): boolean {
  return rows.some(
    (row) =>
      row.relationshipType === 'follow'
      && row.status === 'approved'
      && row.userId === userId
      && row.relatedUserId === targetUserId,
  );
}

export function hasPendingFollow(rows: FollowRow[], userId: string, targetUserId: string): boolean {
  return rows.some(
    (row) =>
      row.relationshipType === 'follow'
      && row.status === 'pending'
      && row.userId === userId
      && row.relatedUserId === targetUserId,
  );
}

export async function fetchRelationshipRows(
  admin: AdminClient,
  userId: string,
  targetUserId: string,
): Promise<FollowRow[]> {
  if (!userId || !targetUserId) {
    return [];
  }

  const { data, error } = await admin
    .from('follows')
    .select('user_id, related_user_id, relationship_type, status')
    .or(
      `and(user_id.eq.${userId},related_user_id.eq.${targetUserId}),`
      + `and(user_id.eq.${targetUserId},related_user_id.eq.${userId})`,
    );

  if (error) {
    throw error;
  }

  return toFollowRows(data as RawFollowRow[] | null | undefined);
}

export async function clearConflictingFollowStates(
  admin: AdminClient,
  userId: string,
  targetUserId: string,
): Promise<void> {
  const { error } = await admin
    .from('follows')
    .delete()
    .eq('relationship_type', 'follow')
    .or(
      `and(user_id.eq.${userId},related_user_id.eq.${targetUserId}),`
      + `and(user_id.eq.${targetUserId},related_user_id.eq.${userId})`,
    );

  if (error) {
    throw error;
  }
}

export async function createBlockRelationship(
  admin: AdminClient,
  userId: string,
  targetUserId: string,
): Promise<{ created: boolean }> {
  await clearConflictingFollowStates(admin, userId, targetUserId);

  const { error } = await admin.from('follows').insert([
    {
      user_id: userId,
      related_user_id: targetUserId,
      relationship_type: 'block',
      status: 'approved',
    },
  ]);

  if (!error) {
    return { created: true };
  }

  if ((error as { code?: string }).code === '23505') {
    return { created: false };
  }

  throw error;
}

export async function removeBlockRelationship(
  admin: AdminClient,
  userId: string,
  targetUserId: string,
): Promise<void> {
  const { error } = await admin
    .from('follows')
    .delete()
    .eq('user_id', userId)
    .eq('related_user_id', targetUserId)
    .eq('relationship_type', 'block');

  if (error) {
    throw error;
  }
}
