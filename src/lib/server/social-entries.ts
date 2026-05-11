import { milestones } from '@/lib/constants/milestones';
import { getCdnImageUrl, isCdnEnabled } from '@/lib/server/cdn';
import type { SocialRelationshipStatus, SocialUserEntry } from '@/types/social';

function toCdnFakeBirdKey(avatarFakeBirdKey: string): string {
  return avatarFakeBirdKey.startsWith('fake:')
    ? avatarFakeBirdKey.slice('fake:'.length)
    : avatarFakeBirdKey;
}

function isMissingSupabaseColumnError(error: unknown, columnName: string): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
    hint?: unknown;
  };
  const code = typeof candidate.code === 'string' ? candidate.code : '';
  const text = [candidate.message, candidate.details, candidate.hint]
    .filter((part): part is string => typeof part === 'string')
    .join(' ')
    .toLowerCase();

  if (!text.includes(columnName.toLowerCase())) {
    return false;
  }

  return code === '42703' || code === 'PGRST204' || code === '';
}

type AdminClient = ReturnType<typeof import('@/lib/supabase/server').createSupabaseAdminClient>;

type ProfileRow = {
  user_id: string;
  username: string | null;
  avatar_palette: string | null;
  avatar_fake_bird_key?: string | null;
  is_house_account?: boolean | null;
};

interface SocialEntriesOptions {
  includeBlockedByViewer?: boolean;
}

export async function buildSocialEntriesByUserId(
  admin: AdminClient,
  userIds: string[],
  viewerId: string | null,
  options: SocialEntriesOptions = {},
): Promise<Map<string, SocialUserEntry>> {
  const uniqueUserIds = [...new Set(userIds)].filter(Boolean);

  if (uniqueUserIds.length === 0) {
    return new Map();
  }

  const { data: profilesWithAvatar, error: profilesWithAvatarError } = await admin
    .from('profiles')
    .select('user_id, username, avatar_palette, avatar_fake_bird_key, is_house_account')
    .in('user_id', uniqueUserIds);

  let profiles = profilesWithAvatar as ProfileRow[] | null;

  if (
    profilesWithAvatarError
    && (isMissingSupabaseColumnError(profilesWithAvatarError, 'avatar_fake_bird_key')
      || isMissingSupabaseColumnError(profilesWithAvatarError, 'is_house_account'))
  ) {
    const fallback = await admin
      .from('profiles')
      .select('user_id, username, avatar_palette')
      .in('user_id', uniqueUserIds);

    if (fallback.error) {
      throw fallback.error;
    }

    profiles = (fallback.data ?? []).map((row) => ({
      ...row,
      avatar_fake_bird_key: null,
      is_house_account: false,
    }));
  } else if (profilesWithAvatarError) {
    throw profilesWithAvatarError;
  }

  const { data: progressRows, error: progressError } = await admin
    .from('player_progress')
    .select('user_id, birds_identified')
    .in('user_id', uniqueUserIds);

  if (progressError) {
    throw progressError;
  }

  let followRows:
    | Array<{ related_user_id: string; status: 'pending' | 'approved' }>
    | null = null;
  let blockedUserIds = new Set<string>();

  if (viewerId) {
    const [followResult, outgoingBlocksResult, incomingBlocksResult] = await Promise.all([
      admin
        .from('follows')
        .select('related_user_id, status')
        .eq('user_id', viewerId)
        .eq('relationship_type', 'follow')
        .in('related_user_id', uniqueUserIds),
      admin
        .from('follows')
        .select('related_user_id')
        .eq('user_id', viewerId)
        .eq('relationship_type', 'block')
        .in('related_user_id', uniqueUserIds),
      admin
        .from('follows')
        .select('user_id')
        .eq('related_user_id', viewerId)
        .eq('relationship_type', 'block')
        .in('user_id', uniqueUserIds),
    ]);

    if (followResult.error) {
      throw followResult.error;
    }

    if (outgoingBlocksResult.error) {
      throw outgoingBlocksResult.error;
    }

    if (incomingBlocksResult.error) {
      throw incomingBlocksResult.error;
    }

    followRows = (followResult.data ?? []) as Array<{ related_user_id: string; status: 'pending' | 'approved' }>;
    blockedUserIds = new Set([
      ...(
        options.includeBlockedByViewer
          ? []
          : (outgoingBlocksResult.data ?? []).map((row) => row.related_user_id as string)
      ),
      ...(incomingBlocksResult.data ?? []).map((row) => row.user_id as string),
    ]);
  }

  const birdsIdentifiedByUserId = new Map(
    (progressRows ?? []).map((row) => [row.user_id as string, typeof row.birds_identified === 'number' ? row.birds_identified : 0]),
  );
  const relationshipByUserId = new Map(
    (followRows ?? []).map((row) => {
      const relationship: SocialRelationshipStatus = row.status === 'approved' ? 'following' : 'requested';
      return [row.related_user_id, relationship];
    }),
  );

  return new Map(
    (profiles ?? []).flatMap((profile) => {
      if (viewerId && viewerId !== profile.user_id && blockedUserIds.has(profile.user_id)) {
        return [];
      }

      const avatarFakeBirdKey = typeof profile.avatar_fake_bird_key === 'string' ? profile.avatar_fake_bird_key : null;
      const avatarFakeBirdImageUrl =
        avatarFakeBirdKey && isCdnEnabled()
          ? getCdnImageUrl(toCdnFakeBirdKey(avatarFakeBirdKey), 'thumb', 'fake')
          : null;
      const isHouseAccount = profile.is_house_account === true;
      const birdsIdentified = birdsIdentifiedByUserId.get(profile.user_id) ?? 0;
      const earnedMilestones = milestones.filter((milestone) => milestone.value <= birdsIdentified);
      const latestBadgeName = isHouseAccount || earnedMilestones.length === 0
        ? null
        : earnedMilestones[earnedMilestones.length - 1].badge;
      const relationship = viewerId && viewerId !== profile.user_id
        ? relationshipByUserId.get(profile.user_id) ?? 'none'
        : 'none';

      const entry: SocialUserEntry = {
        userId: profile.user_id,
        username: profile.username ?? '',
        avatarPalette: profile.avatar_palette ?? 'finch',
        avatarFakeBirdImageUrl,
        isHouseAccount,
        latestBadgeName,
        relationship,
        capabilities: {
          canFollow: Boolean(viewerId) && viewerId !== profile.user_id && relationship === 'none',
          canUnfollow: Boolean(viewerId) && viewerId !== profile.user_id && relationship === 'following',
        },
      };

      return [[profile.user_id, entry] as const];
    }),
  );
}

export async function buildSocialEntries(
  admin: AdminClient,
  userIds: string[],
  viewerId: string | null,
  options: SocialEntriesOptions = {},
): Promise<SocialUserEntry[]> {
  const entriesByUserId = await buildSocialEntriesByUserId(admin, userIds, viewerId, options);
  return userIds.flatMap((userId) => {
    const entry = entriesByUserId.get(userId);
    return entry ? [entry] : [];
  });
}
