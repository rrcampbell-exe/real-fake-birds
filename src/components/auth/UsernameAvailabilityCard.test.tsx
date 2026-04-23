import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: ({ onSuccess }: { onSuccess?: (token: string) => void }) => (
    <button type="button" onClick={() => onSuccess?.('captcha-token')}>
      Complete human check
    </button>
  ),
}));

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
  registerAccount: vi.fn(),
  pullAccountProgress: vi.fn(),
  signInWithUsername: vi.fn(),
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
import { fetchAccountState, registerAccount, signInWithUsername } from '@/lib/auth/account-sync';
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
const mockedRegisterAccount = vi.mocked(registerAccount);
const mockedSignInWithUsername = vi.mocked(signInWithUsername);
const mockedHydrateSignedInAccountToLocalState = vi.mocked(hydrateSignedInAccountToLocalState);
const mockedNotifyAccountStateChanged = vi.mocked(notifyAccountStateChanged);
const mockedPrepareSignedInSessionForSignOut = vi.mocked(prepareSignedInSessionForSignOut);
const mockedPushCurrentLocalProgressToAccount = vi.mocked(pushCurrentLocalProgressToAccount);
const mockedResetLocalStateForGuestSession = vi.mocked(resetLocalStateForGuestSession);
const mockedUseUsernameValidation = vi.mocked(useUsernameValidation);
const mockedGetSupabaseBrowserClient = vi.mocked(getSupabaseBrowserClient);

function createAccountState(overrides: Partial<ReturnType<typeof useAccountState>> = {}): ReturnType<typeof useAccountState> {
  return {
    isLoadingAccount: false,
    isSignedIn: false,
    isBooting: false,
    isBackgroundSyncing: false,
    isAppChromeVisible: true,
    accountEmail: null,
    accountUsername: null,
    remoteSummary: null,
    remoteUnlockedThemes: [],
    weeklyOverview: null,
    refreshAccountState: vi.fn().mockResolvedValue(undefined),
    syncSignedInProgress: vi.fn().mockResolvedValue(undefined),
    isHouseAccount: false,
    ...overrides,
  };
}

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
      setSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null }),
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
    vi.unstubAllEnvs();
    mockedHasSupabaseEnv.mockReturnValue(false);
    mockedUseAccountState.mockReturnValue(createAccountState());
    mockedFetchAccountState.mockReset();
    mockedRegisterAccount.mockReset();
    mockedSignInWithUsername.mockReset();
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

    expect(screen.getAllByRole('button', { name: 'Create account' }).at(-1)).toBeDisabled();
    fireEvent.click(screen.getAllByRole('button', { name: 'Sign in' }).at(-1)!);
    expect(screen.getAllByRole('button', { name: 'Sign in' }).at(-1)).toBeDisabled();
  });

  it('creates an account with required username, password, and confirmation', async () => {
    const onAuthSuccess = vi.fn();
    const refreshAccountState = vi.fn().mockResolvedValue(undefined);
    mockedHasSupabaseEnv.mockReturnValue(true);
    mockedUseAccountState.mockReturnValue(createAccountState({ refreshAccountState }));
    mockedUseUsernameValidation.mockReturnValue({
      value: 'BirdFan_17',
      normalizedUsername: 'birdfan_17',
      issues: [],
      available: true,
      isChecking: false,
      error: null,
      setValue: vi.fn(),
    });
    mockedRegisterAccount.mockResolvedValue({
      action: 'register-account',
      account: {
        email: null,
        username: 'BirdFan_17',
        usernameCanonical: 'birdfan_17',
      },
      requiresEmailVerification: false,
      session: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    });

    render(<UsernameAvailabilityCard onAuthSuccess={onAuthSuccess} />);

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret-password' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'secret-password' } });

    fireEvent.click(screen.getAllByRole('button', { name: 'Create account' }).at(-1)!);

    await waitFor(() => {
      expect(mockedRegisterAccount).toHaveBeenCalledWith({
        username: 'BirdFan_17',
        password: 'secret-password',
      });
    });

    expect(mockedHydrateSignedInAccountToLocalState).toHaveBeenCalled();
    expect(mockedPushCurrentLocalProgressToAccount).toHaveBeenCalled();
    expect(refreshAccountState).toHaveBeenCalled();
    expect(onAuthSuccess).toHaveBeenCalled();
    expect(screen.getByText(/Account created and signed in/i)).toBeInTheDocument();
  });

  it('passes the captcha token when Turnstile is enabled', async () => {
    mockedHasSupabaseEnv.mockReturnValue(true);
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'site-key');
    mockedUseUsernameValidation.mockReturnValue({
      value: 'BirdFan_17',
      normalizedUsername: 'birdfan_17',
      issues: [],
      available: true,
      isChecking: false,
      error: null,
      setValue: vi.fn(),
    });
    mockedRegisterAccount.mockResolvedValue({
      action: 'register-account',
      account: {
        email: null,
        username: 'BirdFan_17',
        usernameCanonical: 'birdfan_17',
      },
      requiresEmailVerification: false,
      session: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    });

    render(<UsernameAvailabilityCard />);

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret-password' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'secret-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Complete human check' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Create account' }).at(-1)!);

    await waitFor(() => {
      expect(mockedRegisterAccount).toHaveBeenCalledWith({
        username: 'BirdFan_17',
        password: 'secret-password',
        captchaToken: 'captcha-token',
      });
    });
  });

  it('keeps the compact create-account flow stripped down', () => {
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

    render(<UsernameAvailabilityCard compact />);

    expect(screen.queryByText('Username rules')).not.toBeInTheDocument();
    expect(screen.queryByText(/Canonical username:/i)).not.toBeInTheDocument();
  });

  it('signs in with email and password', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({ error: null });
    const onAuthSuccess = vi.fn();
    const refreshAccountState = vi.fn().mockResolvedValue(undefined);
    mockedHasSupabaseEnv.mockReturnValue(true);
    mockedUseAccountState.mockReturnValue(createAccountState({ refreshAccountState }));
    mockedSignInWithUsername.mockResolvedValue({
      action: 'sign-in-with-username',
      session: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    });
    mockedGetSupabaseBrowserClient.mockReturnValue(
      createSupabaseClientMock({ signInWithPassword }) as never
    );

    render(<UsernameAvailabilityCard onAuthSuccess={onAuthSuccess} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Sign in' }).at(-1)!);

    await waitFor(() => {
      expect(screen.getByLabelText('Email or username')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Email or username'), { target: { value: 'BirdFan_17' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret-password' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Sign in' }).at(-1)!);

    await waitFor(() => {
      expect(mockedSignInWithUsername).toHaveBeenCalledWith('BirdFan_17', 'secret-password');
    });

    expect(mockedHydrateSignedInAccountToLocalState).toHaveBeenCalled();
    expect(mockedPushCurrentLocalProgressToAccount).toHaveBeenCalled();
    expect(refreshAccountState).toHaveBeenCalled();
    expect(onAuthSuccess).toHaveBeenCalled();
  });

  it('submits account creation when pressing Enter in the password field', async () => {
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
    mockedRegisterAccount.mockResolvedValue({
      action: 'register-account',
      account: {
        email: null,
        username: 'BirdFan_17',
        usernameCanonical: 'birdfan_17',
      },
      requiresEmailVerification: false,
      session: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    });

    render(<UsernameAvailabilityCard />);

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret-password' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'secret-password' } });
    fireEvent.keyDown(screen.getByLabelText('Confirm password'), { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(mockedRegisterAccount).toHaveBeenCalledWith({
        username: 'BirdFan_17',
        password: 'secret-password',
      });
    });
  });

  it('shows a mismatch error when the password confirmation does not match', async () => {
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

    render(<UsernameAvailabilityCard />);

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret-password' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'different-password' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Create account' }).at(-1)!);

    expect(mockedRegisterAccount).not.toHaveBeenCalled();
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
  });

  it('submits sign-in when pressing Enter in the password field', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({ error: null });
    mockedHasSupabaseEnv.mockReturnValue(true);
    mockedSignInWithUsername.mockResolvedValue({
      action: 'sign-in-with-username',
      session: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    });
    mockedGetSupabaseBrowserClient.mockReturnValue(
      createSupabaseClientMock({ signInWithPassword }) as never
    );

    render(<UsernameAvailabilityCard />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Sign in' }).at(-1)!);

    await waitFor(() => {
      expect(screen.getByLabelText('Email or username')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Email or username'), { target: { value: 'BirdFan_17' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret-password' } });
    fireEvent.keyDown(screen.getByLabelText('Password'), { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(mockedSignInWithUsername).toHaveBeenCalledWith('BirdFan_17', 'secret-password');
    });
  });

  it('shows connected account controls and allows sign out when signed in', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    const refreshAccountState = vi.fn().mockResolvedValue(undefined);
    mockedHasSupabaseEnv.mockReturnValue(true);
    mockedUseAccountState.mockReturnValue(createAccountState({
      isSignedIn: true,
      accountEmail: 'bird@example.com',
      accountUsername: 'BirdFan_17',
      remoteSummary: {
        birdsIdentified: 12,
        seeds: 15,
        bestStreak: 4,
        bestDailyStreak: 2,
        bestWeeklyPlacement: null,
        firstPlaceCount: 0,
        secondPlaceCount: 0,
        thirdPlaceCount: 0,
      },
      remoteUnlockedThemes: [],
      weeklyOverview: null,
      refreshAccountState,
    }));
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
        bestWeeklyPlacement: null,
        firstPlaceCount: 0,
        secondPlaceCount: 0,
        thirdPlaceCount: 0,
      },
      unlockedThemes: ['Raven'],
      weeklyOverview: null,
    });

    render(<UsernameAvailabilityCard />);

    await waitFor(() => {
      expect(screen.getByText(/BirdFan_17/)).toBeInTheDocument();
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
});