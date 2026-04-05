import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/env', () => ({
  hasSupabaseEnv: vi.fn(),
}));

vi.mock('@/components/account/AccountStateProvider', () => ({
  useAccountState: vi.fn(),
}));

vi.mock('@/hooks/useUsernameValidation', () => ({
  useUsernameValidation: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowserClient: vi.fn(),
}));

vi.mock('@/lib/auth/account-sync', () => ({
  fetchAccountState: vi.fn(),
  pullAccountProgress: vi.fn(),
  resolveSignInIdentifier: vi.fn(),
  saveProfile: vi.fn(),
  syncLocalProgress: vi.fn(),
}));

vi.mock('@/lib/auth/account-session', () => ({
  ACCOUNT_STATE_CHANGED_EVENT: 'rfb-account-state-changed',
  hydrateSignedInAccountToLocalState: vi.fn(),
  notifyAccountStateChanged: vi.fn(),
  prepareSignedInSessionForSignOut: vi.fn(),
  pushCurrentLocalProgressToAccount: vi.fn(),
  resetLocalStateForGuestSession: vi.fn(),
}));

import { hasSupabaseEnv } from '@/lib/supabase/env';
import { useAccountState } from '@/components/account/AccountStateProvider';
import { fetchAccountState, resolveSignInIdentifier, saveProfile } from '@/lib/auth/account-sync';
import {
  hydrateSignedInAccountToLocalState,
  notifyAccountStateChanged,
  prepareSignedInSessionForSignOut,
  pushCurrentLocalProgressToAccount,
  resetLocalStateForGuestSession,
} from '@/lib/auth/account-session';
import { useUsernameValidation } from '@/hooks/useUsernameValidation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import UsernameAvailabilityCard from './UsernameAvailabilityCard';

const mockedHasSupabaseEnv = vi.mocked(hasSupabaseEnv);
const mockedUseAccountState = vi.mocked(useAccountState);
const mockedFetchAccountState = vi.mocked(fetchAccountState);
const mockedResolveSignInIdentifier = vi.mocked(resolveSignInIdentifier);
const mockedSaveProfile = vi.mocked(saveProfile);
const mockedHydrateSignedInAccountToLocalState = vi.mocked(hydrateSignedInAccountToLocalState);
const mockedNotifyAccountStateChanged = vi.mocked(notifyAccountStateChanged);
const mockedPrepareSignedInSessionForSignOut = vi.mocked(prepareSignedInSessionForSignOut);
const mockedPushCurrentLocalProgressToAccount = vi.mocked(pushCurrentLocalProgressToAccount);
const mockedResetLocalStateForGuestSession = vi.mocked(resetLocalStateForGuestSession);
const mockedUseUsernameValidation = vi.mocked(useUsernameValidation);
const mockedGetSupabaseBrowserClient = vi.mocked(getSupabaseBrowserClient);

function createSupabaseClientMock(overrides?: {
  getUser?: () => Promise<unknown>;
  getSession?: () => Promise<unknown>;
  signInWithPassword?: (options: unknown) => Promise<unknown>;
  signUp?: (options: unknown) => Promise<unknown>;
  signOut?: () => Promise<unknown>;
}) {
  return {
    auth: {
      getUser: overrides?.getUser ?? vi.fn().mockResolvedValue({ data: { user: null } }),
      getSession: overrides?.getSession ?? vi.fn().mockResolvedValue({ data: { session: null } }),
      signInWithPassword: overrides?.signInWithPassword ?? vi.fn().mockResolvedValue({ error: null }),
      signUp: overrides?.signUp ?? vi.fn().mockResolvedValue({
        data: { user: { email: 'bird@example.com' }, session: null },
        error: null,
      }),
      signOut: overrides?.signOut ?? vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      }),
    },
  };
}

describe('UsernameAvailabilityCard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockedHasSupabaseEnv.mockReturnValue(false);
    mockedUseAccountState.mockReturnValue({
      isLoadingAccount: false,
      accountEmail: null,
      accountUsername: null,
      remoteSummary: null,
      remoteUnlockedThemes: [],
      refreshAccountState: vi.fn(),
    });
    mockedFetchAccountState.mockReset();
    mockedResolveSignInIdentifier.mockReset();
    mockedSaveProfile.mockReset();
    mockedHydrateSignedInAccountToLocalState.mockReset();
    mockedNotifyAccountStateChanged.mockReset();
    mockedPrepareSignedInSessionForSignOut.mockReset();
    mockedPushCurrentLocalProgressToAccount.mockReset();
    mockedResetLocalStateForGuestSession.mockReset();
    mockedUseUsernameValidation.mockReturnValue({
      value: '',
      normalizedUsername: '',
      issues: [],
      available: null,
      isChecking: false,
      error: null,
      setValue: vi.fn(),
    });
    mockedGetSupabaseBrowserClient.mockReturnValue(createSupabaseClientMock() as never);
  });

  it('disables email auth buttons when Supabase is not configured', () => {
    render(<UsernameAvailabilityCard />);

    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
  });

  it('creates an email/password account with the requested username', async () => {
    const signUp = vi.fn().mockResolvedValue({
      data: {
        user: { email: 'bird@example.com' },
        session: { access_token: 'session-token' },
      },
      error: null,
    });
    mockedHasSupabaseEnv.mockReturnValue(true);
    mockedUseUsernameValidation.mockReturnValue({
      value: 'BirdFan_17',
      normalizedUsername: 'birdfan_17',
      issues: [],
      available: true,
      isChecking: false,
      error: null,
      setValue: vi.fn(),
    });
    mockedSaveProfile.mockResolvedValue({
      action: 'save-profile',
      profile: {
        username: 'BirdFan_17',
        usernameCanonical: 'birdfan_17',
        avatarPalette: 'finch',
      },
    });
    mockedGetSupabaseBrowserClient.mockReturnValue(
      createSupabaseClientMock({ signUp }) as never
    );

    render(<UsernameAvailabilityCard />);

    await waitFor(() => {
      expect(screen.getByLabelText('Email or username')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Email or username'), { target: { value: 'bird@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret-password' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(signUp).toHaveBeenCalledWith({
        email: 'bird@example.com',
        password: 'secret-password',
        options: {
          data: {
            requested_username: 'BirdFan_17',
          },
        },
      });
    });

    expect(mockedSaveProfile).toHaveBeenCalledWith('BirdFan_17');
    expect(mockedPushCurrentLocalProgressToAccount).toHaveBeenCalled();
  });

  it('signs in with email and password', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({ error: null });
    mockedHasSupabaseEnv.mockReturnValue(true);
    mockedResolveSignInIdentifier.mockResolvedValue({
      action: 'resolve-sign-in-identifier',
      email: 'bird@example.com',
    });
    mockedGetSupabaseBrowserClient.mockReturnValue(
      createSupabaseClientMock({ signInWithPassword }) as never
    );

    render(<UsernameAvailabilityCard />);

    await waitFor(() => {
      expect(screen.getByLabelText('Email or username')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Email or username'), { target: { value: 'BirdFan_17' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(mockedResolveSignInIdentifier).toHaveBeenCalledWith('BirdFan_17');
    });

    await waitFor(() => {
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: 'bird@example.com',
        password: 'secret-password',
      });
    });

    expect(mockedHydrateSignedInAccountToLocalState).toHaveBeenCalled();
  });

  it('shows connected account controls and allows sign out when signed in', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    const refreshAccountState = vi.fn().mockResolvedValue(undefined);
    mockedHasSupabaseEnv.mockReturnValue(true);
    mockedUseAccountState.mockReturnValue({
      isLoadingAccount: false,
      accountEmail: 'bird@example.com',
      accountUsername: 'BirdFan_17',
      remoteSummary: {
        birdsIdentified: 12,
        seeds: 15,
        bestStreak: 4,
        bestDailyStreak: 2,
      },
      remoteUnlockedThemes: [],
      refreshAccountState,
    });
    mockedGetSupabaseBrowserClient.mockReturnValue(
      createSupabaseClientMock({
        getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'user-1', email: 'bird@example.com' } } } }),
        signOut,
      }) as never
    );
    mockedFetchAccountState.mockResolvedValue({
      action: 'get-account-state',
      email: 'bird@example.com',
      profile: {
        username: 'BirdFan_17',
        usernameCanonical: 'birdfan_17',
        avatarPalette: 'finch',
      },
      lastLocalSyncAt: null,
      progressSummary: {
        birdsIdentified: 20,
        seeds: 40,
        bestStreak: 8,
        bestDailyStreak: 3,
      },
      unlockedThemes: ['Raven'],
    });

    render(<UsernameAvailabilityCard />);

    await waitFor(() => {
      expect(screen.getByText('BirdFan_17')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => {
      expect(signOut).toHaveBeenCalled();
    });

    expect(mockedPrepareSignedInSessionForSignOut).toHaveBeenCalled();
    expect(mockedResetLocalStateForGuestSession).toHaveBeenCalled();
    expect(refreshAccountState).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('does not offer username updates once an account already has one', async () => {
    mockedHasSupabaseEnv.mockReturnValue(true);
    mockedUseAccountState.mockReturnValue({
      isLoadingAccount: false,
      accountEmail: 'bird@example.com',
      accountUsername: 'BirdFan_17',
      remoteSummary: {
        birdsIdentified: 20,
        seeds: 40,
        bestStreak: 8,
        bestDailyStreak: 3,
      },
      remoteUnlockedThemes: [],
      refreshAccountState: vi.fn(),
    });
    const setValue = vi.fn();
    mockedUseUsernameValidation.mockReturnValue({
      value: 'BirdFan_17',
      normalizedUsername: 'birdfan_17',
      issues: [],
      available: true,
      isChecking: false,
      error: null,
      setValue,
    });
    mockedGetSupabaseBrowserClient.mockReturnValue(
      createSupabaseClientMock({
        getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'user-1', email: 'bird@example.com' } } } }),
      }) as never
    );
    mockedFetchAccountState.mockResolvedValue({
      action: 'get-account-state',
      email: 'bird@example.com',
      profile: {
        username: 'BirdFan_17',
        usernameCanonical: 'birdfan_17',
        avatarPalette: 'finch',
      },
      lastLocalSyncAt: null,
      progressSummary: {
        birdsIdentified: 20,
        seeds: 40,
        bestStreak: 8,
        bestDailyStreak: 3,
      },
      unlockedThemes: [],
    });
    render(<UsernameAvailabilityCard />);

    await waitFor(() => {
      expect(screen.getByText('BirdFan_17')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'Update username' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save username' })).not.toBeInTheDocument();
  });
});