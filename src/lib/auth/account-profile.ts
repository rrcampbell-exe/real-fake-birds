import type { SupabaseClient, User } from '@supabase/supabase-js';
import { getCurrentWeekStart } from '@/lib/utils/weekly-leaderboard';
import { validateUsername } from '@/lib/auth/username';

interface ProfileRow {
  username: string;
  usernameCanonical: string;
  avatarPalette: string;
}

export interface EnsureAccountProfileResult {
  status: 'existing' | 'created' | 'missing_username' | 'invalid_username' | 'username_unavailable' | 'error';
  profile: ProfileRow | null;
}

async function isUsernameAvailable(
  admin: SupabaseClient,
  usernameCanonical: string,
  excludeUserId?: string,
): Promise<boolean | null> {
  let query = admin
    .from('profiles')
    .select('user_id', { count: 'exact', head: true })
    .eq('username_canonical', usernameCanonical)
    .limit(1);

  if (excludeUserId) {
    query = query.neq('user_id', excludeUserId);
  }

  const { count, error } = await query;
  if (error) {
    return null;
  }

  return (count ?? 0) === 0;
}

export async function ensureAccountProfileFromUserMetadata(options: {
  admin: SupabaseClient;
  user: User;
}): Promise<EnsureAccountProfileResult> {
  const { admin, user } = options;

  const { data: existingProfile, error: existingProfileError } = await admin
    .from('profiles')
    .select('username, username_canonical, avatar_palette')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingProfileError) {
    return { status: 'error', profile: null };
  }

  if (existingProfile) {
    await admin
      .from('leaderboard_stats')
      .upsert(
        {
          user_id: user.id,
          username_canonical: existingProfile.username_canonical,
          current_week_start: getCurrentWeekStart(),
        },
        { onConflict: 'user_id' }
      );

    return {
      status: 'existing',
      profile: {
        username: existingProfile.username,
        usernameCanonical: existingProfile.username_canonical,
        avatarPalette: existingProfile.avatar_palette,
      },
    };
  }

  const requestedUsername = typeof user.user_metadata?.requested_username === 'string'
    ? user.user_metadata.requested_username.trim()
    : '';

  if (!requestedUsername) {
    return { status: 'missing_username', profile: null };
  }

  const validation = validateUsername(requestedUsername);
  if (!validation.isValid) {
    return { status: 'invalid_username', profile: null };
  }

  const available = await isUsernameAvailable(admin, validation.normalizedUsername, user.id);
  if (available === false) {
    return { status: 'username_unavailable', profile: null };
  }

  if (available === null) {
    return { status: 'error', profile: null };
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .upsert(
      {
        user_id: user.id,
        username: requestedUsername,
        username_canonical: validation.normalizedUsername,
        avatar_palette: 'finch',
      },
      { onConflict: 'user_id' }
    )
    .select('username, username_canonical, avatar_palette')
    .single();

  if (profileError || !profile) {
    return { status: 'error', profile: null };
  }

  const { error: leaderboardError } = await admin
    .from('leaderboard_stats')
    .upsert(
      {
        user_id: user.id,
        username_canonical: validation.normalizedUsername,
        current_week_start: getCurrentWeekStart(),
      },
      { onConflict: 'user_id' }
    );

  if (leaderboardError) {
    return { status: 'error', profile: null };
  }

  return {
    status: 'created',
    profile: {
      username: profile.username,
      usernameCanonical: profile.username_canonical,
      avatarPalette: profile.avatar_palette,
    },
  };
}