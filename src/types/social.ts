export type SocialRelationshipStatus = 'none' | 'requested' | 'following';

export interface SocialEntryCapabilities {
  canFollow: boolean;
  canUnfollow: boolean;
}

export interface SocialUserEntry {
  userId: string;
  username: string;
  avatarPalette: string;
  avatarFakeBirdImageUrl: string | null;
  isHouseAccount: boolean;
  latestBadgeName: string | null;
  relationship: SocialRelationshipStatus;
  capabilities: SocialEntryCapabilities;
}

export interface SocialConnectionsListResponse {
  entries: SocialUserEntry[];
}

export interface UserSearchResponse {
  users: SocialUserEntry[];
}