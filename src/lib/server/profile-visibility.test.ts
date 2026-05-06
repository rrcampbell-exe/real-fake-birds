import { describe, expect, it } from 'vitest';
import { resolveProfileVisibility, resolveProfileRelationshipAndCapabilities } from './profile-visibility';
import type { FollowRow } from '@/types/profile';

const TARGET = { userId: 'target-uid', privacyMode: 'public' as const };
const TARGET_PRIVATE = { userId: 'target-uid', privacyMode: 'private' as const };
const VIEWER_ID = 'viewer-uid';
const NO_FOLLOWS: FollowRow[] = [];

function followRow(
  userId: string,
  relatedUserId: string,
  type: 'follow' | 'block',
  status: 'pending' | 'approved' = 'pending',
): FollowRow {
  return { userId, relatedUserId, relationshipType: type, status };
}

describe('resolveProfileVisibility', () => {
  it('returns owner when viewerId matches targetProfile.userId', () => {
    const result = resolveProfileVisibility('target-uid', TARGET, NO_FOLLOWS);
    expect(result).toEqual({ reason: 'owner', canViewFull: true, canFollow: false });
  });

  it('returns public_profile for a public profile with any logged-in viewer', () => {
    const result = resolveProfileVisibility(VIEWER_ID, TARGET, NO_FOLLOWS);
    expect(result).toEqual({ reason: 'public_profile', canViewFull: true, canFollow: true });
  });

  it('returns public_profile for a public profile with a guest viewer', () => {
    const result = resolveProfileVisibility(null, TARGET, NO_FOLLOWS);
    expect(result.reason).toBe('public_profile');
    expect(result.canViewFull).toBe(true);
    expect(result.canFollow).toBe(false); // guests cannot follow
  });

  it('returns blocked when target has blocked viewer', () => {
    const rows = [followRow('target-uid', VIEWER_ID, 'block')];
    const result = resolveProfileVisibility(VIEWER_ID, TARGET, rows);
    expect(result).toEqual({ reason: 'blocked', canViewFull: false, canFollow: false });
  });

  it('returns blocked when viewer has blocked target', () => {
    const rows = [followRow(VIEWER_ID, 'target-uid', 'block')];
    const result = resolveProfileVisibility(VIEWER_ID, TARGET, rows);
    expect(result).toEqual({ reason: 'blocked', canViewFull: false, canFollow: false });
  });

  it('returns approved_follower for private profile with approved follow', () => {
    const rows = [followRow(VIEWER_ID, 'target-uid', 'follow', 'approved')];
    const result = resolveProfileVisibility(VIEWER_ID, TARGET_PRIVATE, rows);
    expect(result).toEqual({ reason: 'approved_follower', canViewFull: true, canFollow: false });
  });

  it('returns private_unapproved for private profile with pending follow', () => {
    const rows = [followRow(VIEWER_ID, 'target-uid', 'follow', 'pending')];
    const result = resolveProfileVisibility(VIEWER_ID, TARGET_PRIVATE, rows);
    expect(result.reason).toBe('private_unapproved');
    expect(result.canViewFull).toBe(false);
    expect(result.canFollow).toBe(false); // already sent request
  });

  it('returns private_unapproved for private profile with no follow relationship', () => {
    const result = resolveProfileVisibility(VIEWER_ID, TARGET_PRIVATE, NO_FOLLOWS);
    expect(result.reason).toBe('private_unapproved');
    expect(result.canViewFull).toBe(false);
    expect(result.canFollow).toBe(true);
  });

  it('returns private_unapproved with canFollow=false for guest viewer on private profile', () => {
    const result = resolveProfileVisibility(null, TARGET_PRIVATE, NO_FOLLOWS);
    expect(result.reason).toBe('private_unapproved');
    expect(result.canFollow).toBe(false);
  });
});

describe('resolveProfileRelationshipAndCapabilities', () => {
  it('returns owner relationship for the profile owner', () => {
    const result = resolveProfileRelationshipAndCapabilities('target-uid', TARGET, NO_FOLLOWS);
    expect(result.relationship).toBe('owner');
    expect(result.capabilities.canFollow).toBe(false);
    expect(result.capabilities.canUnfollow).toBe(false);
    expect(result.capabilities.canChallengeBirdBlitz).toBe(false);
  });

  it('returns none relationship for non-following viewer of public profile', () => {
    const result = resolveProfileRelationshipAndCapabilities(VIEWER_ID, TARGET, NO_FOLLOWS);
    expect(result.relationship).toBe('none');
    expect(result.capabilities.canFollow).toBe(true);
    expect(result.capabilities.canUnfollow).toBe(false);
    expect(result.capabilities.canChallengeBirdBlitz).toBe(true);
  });

  it('returns following relationship for approved follower of public profile', () => {
    const rows = [followRow(VIEWER_ID, 'target-uid', 'follow', 'approved')];
    const result = resolveProfileRelationshipAndCapabilities(VIEWER_ID, TARGET, rows);
    expect(result.relationship).toBe('following');
    expect(result.capabilities.canFollow).toBe(false);
    expect(result.capabilities.canUnfollow).toBe(true);
    expect(result.capabilities.canChallengeBirdBlitz).toBe(true);
  });

  it('returns requested relationship for pending follow to private profile', () => {
    const rows = [followRow(VIEWER_ID, 'target-uid', 'follow', 'pending')];
    const result = resolveProfileRelationshipAndCapabilities(VIEWER_ID, TARGET_PRIVATE, rows);
    expect(result.relationship).toBe('requested');
    expect(result.capabilities.canFollow).toBe(false);
    expect(result.capabilities.canUnfollow).toBe(false);
    expect(result.capabilities.canChallengeBirdBlitz).toBe(false);
  });

  it('returns following relationship for approved follower of private profile', () => {
    const rows = [followRow(VIEWER_ID, 'target-uid', 'follow', 'approved')];
    const result = resolveProfileRelationshipAndCapabilities(VIEWER_ID, TARGET_PRIVATE, rows);
    expect(result.relationship).toBe('following');
    expect(result.capabilities.canFollow).toBe(false);
    expect(result.capabilities.canUnfollow).toBe(true);
    expect(result.capabilities.canChallengeBirdBlitz).toBe(true);
  });

  it('returns blocked relationship when either party has blocked', () => {
    const rows = [followRow('target-uid', VIEWER_ID, 'block')];
    const result = resolveProfileRelationshipAndCapabilities(VIEWER_ID, TARGET, rows);
    expect(result.relationship).toBe('blocked');
    expect(result.capabilities.canFollow).toBe(false);
    expect(result.capabilities.canUnfollow).toBe(false);
    expect(result.capabilities.canChallengeBirdBlitz).toBe(false);
  });

  it('allows guest to view public profile but prevents following and challenging', () => {
    const result = resolveProfileRelationshipAndCapabilities(null, TARGET, NO_FOLLOWS);
    expect(result.relationship).toBe('none');
    expect(result.capabilities.canFollow).toBe(false);
    expect(result.capabilities.canUnfollow).toBe(false);
    expect(result.capabilities.canChallengeBirdBlitz).toBe(false);
  });

  it('prevents challenge on private unapproved viewer', () => {
    const result = resolveProfileRelationshipAndCapabilities(VIEWER_ID, TARGET_PRIVATE, NO_FOLLOWS);
    expect(result.relationship).toBe('none');
    expect(result.capabilities.canFollow).toBe(true);
    expect(result.capabilities.canUnfollow).toBe(false);
    expect(result.capabilities.canChallengeBirdBlitz).toBe(false);
  });
});
