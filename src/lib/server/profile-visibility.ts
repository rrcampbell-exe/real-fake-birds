import type {
  BirdBlitzChallengeAccess,
  FollowRow,
  ProfileBlockState,
  ProfileVisibility,
  ProfileVisibilityReason,
  UserRelationshipStatus,
  ProfileCapabilities,
} from '@/types/profile';

interface TargetProfile {
  userId: string;
  privacyMode: 'public' | 'private';
}

/**
 * Resolves a viewer's visibility level for a target profile.
 *
 * Pure function — takes pre-fetched follow rows so it is testable without DB.
 * All profile read paths must go through this function.
 *
 * @param viewerId - Authenticated viewer's user ID, or null for guests.
 * @param targetProfile - The profile being viewed.
 * @param followsRows - All follow/block rows involving either party.
 */
export function resolveProfileVisibility(
  viewerId: string | null,
  targetProfile: TargetProfile,
  followsRows: FollowRow[],
): ProfileVisibility {
  // Owner always gets full access
  if (viewerId && viewerId === targetProfile.userId) {
    return { reason: 'owner', canViewFull: true, canFollow: false };
  }

  // Check for blocks in either direction
  const isBlockedByTarget = followsRows.some(
    (row) =>
      row.relationshipType === 'block' &&
      row.userId === targetProfile.userId &&
      row.relatedUserId === viewerId,
  );
  const isBlockingTarget = followsRows.some(
    (row) =>
      row.relationshipType === 'block' &&
      row.userId === viewerId &&
      row.relatedUserId === targetProfile.userId,
  );

  if (isBlockedByTarget || isBlockingTarget) {
    return { reason: 'blocked', canViewFull: false, canFollow: false };
  }

  // Public profile — any viewer (including guests) gets full data
  if (targetProfile.privacyMode === 'public') {
    return { reason: 'public_profile', canViewFull: true, canFollow: viewerId !== null };
  }

  // Private profile — check for approved follow
  if (viewerId) {
    const hasApprovedFollow = followsRows.some(
      (row) =>
        row.relationshipType === 'follow' &&
        row.status === 'approved' &&
        row.userId === viewerId &&
        row.relatedUserId === targetProfile.userId,
    );

    if (hasApprovedFollow) {
      return { reason: 'approved_follower', canViewFull: true, canFollow: false };
    }

    // Private, authenticated, no approved follow
    const hasPendingFollow = followsRows.some(
      (row) =>
        row.relationshipType === 'follow' &&
        row.status === 'pending' &&
        row.userId === viewerId &&
        row.relatedUserId === targetProfile.userId,
    );

    return {
      reason: 'private_unapproved' as ProfileVisibilityReason,
      canViewFull: false,
      canFollow: !hasPendingFollow,
    };
  }

  // Private profile, guest viewer
  return { reason: 'private_unapproved', canViewFull: false, canFollow: false };
}

export function resolveProfileBlockState(
  viewerId: string | null,
  targetProfile: TargetProfile,
  followsRows: FollowRow[],
): ProfileBlockState {
  if (!viewerId || viewerId === targetProfile.userId) {
    return 'none';
  }

  const isBlockedByTarget = followsRows.some(
    (row) =>
      row.relationshipType === 'block' &&
      row.userId === targetProfile.userId &&
      row.relatedUserId === viewerId,
  );

  if (isBlockedByTarget) {
    return 'blocked_by_target';
  }

  const isBlockingTarget = followsRows.some(
    (row) =>
      row.relationshipType === 'block' &&
      row.userId === viewerId &&
      row.relatedUserId === targetProfile.userId,
  );

  return isBlockingTarget ? 'viewer_blocked_target' : 'none';
}

export function resolveBirdBlitzChallengeAccess(
  viewerId: string | null,
  targetProfile: TargetProfile,
  followsRows: FollowRow[],
): BirdBlitzChallengeAccess {
  if (!viewerId) {
    return { allowed: false, reason: 'unauthenticated' };
  }

  if (viewerId === targetProfile.userId) {
    return { allowed: false, reason: 'owner' };
  }

  const visibility = resolveProfileVisibility(viewerId, targetProfile, followsRows);
  if (visibility.reason === 'blocked') {
    return { allowed: false, reason: 'blocked' };
  }

  if (!visibility.canViewFull) {
    return { allowed: false, reason: 'private_requires_approved_follow' };
  }

  return { allowed: true, reason: 'allowed' };
}

/**
 * Derives the viewer's relationship status and capabilities for a target profile.
 * Wraps resolveProfileVisibility and adds explicit relationship state and action capabilities.
 *
 * Pure function — deterministic output from pre-fetched data.
 *
 * @param viewerId - Authenticated viewer's user ID, or null for guests.
 * @param targetProfile - The profile being viewed.
 * @param followsRows - All follow/block rows involving either party.
 * @returns { visibility, relationship, capabilities }
 */
export function resolveProfileRelationshipAndCapabilities(
  viewerId: string | null,
  targetProfile: TargetProfile,
  followsRows: FollowRow[],
): {
  visibility: ProfileVisibility;
  relationship: UserRelationshipStatus;
  blockState: ProfileBlockState;
  capabilities: ProfileCapabilities;
} {
  const visibility = resolveProfileVisibility(viewerId, targetProfile, followsRows);
  const blockState = resolveProfileBlockState(viewerId, targetProfile, followsRows);

  // Derive relationship status from visibility and follow state
  let relationship: UserRelationshipStatus;
  if (visibility.reason === 'owner') {
    relationship = 'owner';
  } else if (visibility.reason === 'blocked') {
    relationship = 'blocked';
  } else if (visibility.reason === 'approved_follower') {
    relationship = 'following';
  } else if (visibility.reason === 'private_unapproved') {
    // Check if there's a pending follow request
    const hasPendingFollow =
      viewerId &&
      followsRows.some(
        (row) =>
          row.relationshipType === 'follow' &&
          row.status === 'pending' &&
          row.userId === viewerId &&
          row.relatedUserId === targetProfile.userId,
      );
    relationship = hasPendingFollow ? 'requested' : 'none';
  } else {
    // public_profile — check if already following
    const isFollowing =
      viewerId &&
      followsRows.some(
        (row) =>
          row.relationshipType === 'follow' &&
          row.status === 'approved' &&
          row.userId === viewerId &&
          row.relatedUserId === targetProfile.userId,
      );
    relationship = isFollowing ? 'following' : 'none';
  }

  // Derive capabilities based on visibility and relationship
  const canFollow =
    visibility.canFollow && !['following', 'requested', 'owner'].includes(relationship);
  const canUnfollow = relationship === 'following';
  const birdBlitzChallengeAccess = resolveBirdBlitzChallengeAccess(
    viewerId,
    targetProfile,
    followsRows,
  );

  const capabilities: ProfileCapabilities = {
    canFollow,
    canUnfollow,
    canChallengeBirdBlitz: birdBlitzChallengeAccess.allowed,
  };

  return { visibility, relationship, blockState, capabilities };
}
