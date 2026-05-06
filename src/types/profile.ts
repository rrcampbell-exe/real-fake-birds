/**
 * Profile visibility and payload types for S1-01.
 *
 * All profile read paths must return a ProfileReadResponse so the frontend
 * can render the correct state without inferring visibility from missing fields.
 */

/** Why a given viewer can or cannot see a profile's full data. */
export type ProfileVisibilityReason =
  | 'owner'              // viewer is the profile owner
  | 'public_profile'     // profile is public; any viewer gets full data
  | 'approved_follower'  // profile is private; viewer has an approved follow
  | 'private_unapproved' // profile is private; viewer has no approved follow
  | 'blocked';           // either party has blocked the other

export interface ProfileVisibility {
  reason: ProfileVisibilityReason;
  /** Whether the viewer receives the full profile payload. */
  canViewFull: boolean;
  /** Whether the viewer is allowed to send a follow request. */
  canFollow: boolean;
}

// ---------------------------------------------------------------------------
// Relationship state and capabilities (explicit, server-owned)
// ---------------------------------------------------------------------------

/** The viewer's relationship to the target profile. */
export type UserRelationshipStatus =
  | 'none'       // no relationship
  | 'requested'  // viewer has pending follow request to target (target is private)
  | 'following'  // viewer is following target (either status or owner-only)
  | 'owner'      // viewer is viewing their own profile
  | 'blocked';   // either party has blocked the other

/** Capabilities the viewer has relative to the target. */
export interface ProfileCapabilities {
  /** Whether the viewer can initiate or update a follow action. */
  canFollow: boolean;
  /** Whether the viewer can unfollow this target. */
  canUnfollow: boolean;
  /** Whether the viewer can challenge this target in Bird Blitz. */
  canChallengeBirdBlitz: boolean;
}

// ---------------------------------------------------------------------------
// All-time progress summary (included in full payloads)
// ---------------------------------------------------------------------------

export interface ProfileProgressSummary {
  birdsIdentified: number;
  seeds: number;
  bestStreak: number;
  bestDailyStreak: number;
  bestWeeklyPlacement: number | null;
  firstPlaceCount: number;
  secondPlaceCount: number;
  thirdPlaceCount: number;
}

// ---------------------------------------------------------------------------
// Payload shapes returned by GET /api/profile
// ---------------------------------------------------------------------------

/**
 * Returned when the viewer is the profile owner.
 * Includes privacy mode so the owner can see and change it.
 */
export interface OwnProfilePayload {
  kind: 'own';
  username: string;
  avatarPalette: string;
  avatarFakeBirdImageUrl?: string | null;
  isHouseAccount: boolean;
  joinedMonthYear: string; // e.g. "April 2026"
  privacyMode: 'public' | 'private';
  followerCount: number;
  followingCount: number;
  progress: ProfileProgressSummary;
}

/**
 * Returned to approved followers of private profiles, and to any viewer
 * of a public profile.
 */
export interface PublicProfilePayload {
  kind: 'public';
  username: string;
  avatarPalette: string;
  avatarFakeBirdImageUrl?: string | null;
  isHouseAccount: boolean;
  joinedMonthYear: string;
  progress: ProfileProgressSummary;
  followerCount: number;
  followingCount: number;
}

/**
 * Returned to unapproved viewers of private profiles.
 * Contains only the minimum fields required by the global product decisions.
 */
export interface RestrictedProfilePayload {
  kind: 'restricted';
  username: string;
  isHouseAccount: boolean;
  joinedMonthYear: string;
  followerCount: number;
  followingCount: number;
}

export type ProfilePayload =
  | OwnProfilePayload
  | PublicProfilePayload
  | RestrictedProfilePayload;

// ---------------------------------------------------------------------------
// Top-level API response
// ---------------------------------------------------------------------------

export interface ProfileReadResponse {
  visibility: ProfileVisibility;
  /** The viewer's relationship to this profile (none, requested, following, owner, blocked). */
  relationship: UserRelationshipStatus;
  /** Capabilities the viewer has for actions on this profile. */
  capabilities: ProfileCapabilities;
  /**
   * null only when the viewer is blocked (or target user does not exist).
   * Use visibility.reason to distinguish the two cases on the client.
   */
  profile: ProfilePayload | null;
}

// ---------------------------------------------------------------------------
// DB row shape used by the server-side resolver
// ---------------------------------------------------------------------------

export interface FollowRow {
  userId: string;
  relatedUserId: string;
  relationshipType: 'follow' | 'block';
  status: 'pending' | 'approved';
}
