'use client';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { isNativePlatform } from '@/lib/native/platform';

const SESSION_REFRESH_WINDOW_MS = 60_000;

type SessionRecoveryResult = {
  hasSession: boolean;
  refreshed: boolean;
  userId: string | null;
};

function getSessionRefreshLeadMs(expiresAtSeconds: number | null | undefined): number | null {
  if (typeof expiresAtSeconds !== 'number') {
    return null;
  }

  return (expiresAtSeconds * 1000) - Date.now();
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function logNativeAuthEvent(event: string, detail?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !isNativePlatform()) {
    return;
  }

  if (detail && Object.keys(detail).length > 0) {
    console.info(`[native-auth] ${event}`, detail);
    return;
  }

  console.info(`[native-auth] ${event}`);
}

export async function ensureBrowserSession(options?: {
  forceRefresh?: boolean;
  reason?: string;
}): Promise<SessionRecoveryResult> {
  const supabase = getSupabaseBrowserClient();

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw error;
    }

    const session = data.session;
    const refreshLeadMs = getSessionRefreshLeadMs(session?.expires_at);
    const shouldRefresh = options?.forceRefresh
      || (typeof refreshLeadMs === 'number' && refreshLeadMs <= SESSION_REFRESH_WINDOW_MS);

    if (!session && !options?.forceRefresh) {
      logNativeAuthEvent('session-missing', {
        reason: options?.reason ?? 'unspecified',
      });

      return {
        hasSession: false,
        refreshed: false,
        userId: null,
      };
    }

    if (!shouldRefresh && session?.user) {
      logNativeAuthEvent('session-ready', {
        reason: options?.reason ?? 'unspecified',
        refreshLeadMs,
        userId: session.user.id,
      });

      return {
        hasSession: true,
        refreshed: false,
        userId: session.user.id,
      };
    }

    const { data: refreshedData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      throw refreshError;
    }

    const refreshedSession = refreshedData.session ?? session ?? null;
    logNativeAuthEvent(
      refreshedSession?.user ? 'session-refreshed' : 'session-refresh-empty',
      {
        reason: options?.reason ?? 'unspecified',
        forced: Boolean(options?.forceRefresh),
        userId: refreshedSession?.user.id ?? null,
      }
    );

    return {
      hasSession: Boolean(refreshedSession?.user),
      refreshed: true,
      userId: refreshedSession?.user.id ?? null,
    };
  } catch (error) {
    logNativeAuthEvent('session-check-failed', {
      reason: options?.reason ?? 'unspecified',
      forced: Boolean(options?.forceRefresh),
      message: getErrorMessage(error),
    });

    return {
      hasSession: false,
      refreshed: Boolean(options?.forceRefresh),
      userId: null,
    };
  }
}

export async function recoverBrowserSessionFromUnauthorized(reason: string): Promise<boolean> {
  const currentSession = await ensureBrowserSession({
    reason: `${reason}:recheck`,
  });

  if (!currentSession.hasSession) {
    return false;
  }

  const refreshedSession = await ensureBrowserSession({
    forceRefresh: true,
    reason: `${reason}:forced-refresh`,
  });

  return refreshedSession.hasSession;
}
