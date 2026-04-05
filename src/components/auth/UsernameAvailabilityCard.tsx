'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useAccountState } from '@/components/account/AccountStateProvider';
import {
  registerAccount,
  resolveSignInIdentifier,
  saveProfile,
} from '@/lib/auth/account-sync';
import {
  hydrateSignedInAccountToLocalState,
  notifyAccountStateChanged,
  prepareSignedInSessionForSignOut,
  pushCurrentLocalProgressToAccount,
  resetLocalStateForGuestSession,
} from '@/lib/auth/account-session';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useUsernameValidation } from '@/hooks/useUsernameValidation';

const usernameGuidance = [
  '3 to 20 characters',
  'Letters, numbers, and underscores only',
  'No offensive names or reserved words',
];

export default function UsernameAvailabilityCard() {
  const supabaseReady = hasSupabaseEnv();
  const {
    isLoadingAccount,
    accountEmail,
    accountUsername,
    remoteSummary,
    refreshAccountState,
  } = useAccountState();
  const { value, normalizedUsername, issues, available, isChecking, error, setValue } = useUsernameValidation();
  const usernameValueRef = useRef(value);
  const hasPrefilledUsernameRef = useRef(false);
  const [authMode, setAuthMode] = useState<'create' | 'sign-in'>('create');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [signInIdentifier, setSignInIdentifier] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [showUsernameRules, setShowUsernameRules] = useState(false);
  const [hasSignedOutLocally, setHasSignedOutLocally] = useState(false);
  const savedUsername = accountUsername;
  const effectiveAccountEmail = hasSignedOutLocally ? null : accountEmail;
  const effectiveSavedUsername = hasSignedOutLocally ? null : savedUsername;

  useEffect(() => {
    usernameValueRef.current = value;
  }, [value]);

  useEffect(() => {
    setAuthError(null);
    setAuthNotice(null);
  }, [authMode]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const authErrorParam = params.get('authError');

    if (authErrorParam) {
      setAuthError(authErrorParam.replace(/_/g, ' '));
    }
  }, []);

  useEffect(() => {
    if (!effectiveAccountEmail) {
      hasPrefilledUsernameRef.current = false;
      return;
    }

    if (!usernameValueRef.current.trim() && accountUsername && !hasPrefilledUsernameRef.current) {
      hasPrefilledUsernameRef.current = true;
      setValue(accountUsername);
    }
  }, [accountEmail, accountUsername, effectiveAccountEmail, setValue]);

  const handleCreateAccountSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleCreateAccount();
  };

  const handleSignInSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleEmailSignIn();
  };

  const handleCreateAccountKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    void handleCreateAccount();
  };

  const handleSignInKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    void handleEmailSignIn();
  };

  const handleCreateAccount = async () => {
    if (!supabaseReady || isCreatingAccount) {
      return;
    }

    if (!createEmail.trim() || !createPassword) {
      setAuthError('Enter an email address, username, and password first.');
      return;
    }

    if (!createEmail.includes('@')) {
      setAuthError('Use an email address when creating an account.');
      return;
    }

    if (!value.trim()) {
      setShowUsernameRules(true);
      setAuthError('Choose a username before creating an account.');
      return;
    }

    if (issues.length > 0 || available === false) {
      setShowUsernameRules(true);
      setAuthError('Pick an available username before creating your account.');
      return;
    }

    setIsCreatingAccount(true);
    setAuthError(null);
    setAuthNotice(null);

    try {
      await registerAccount({
        username: value.trim(),
        email: createEmail.trim().toLowerCase(),
        password: createPassword,
      });

      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: createEmail.trim().toLowerCase(),
        password: createPassword,
      });

      if (signInError) {
        throw signInError;
      }

      await pushCurrentLocalProgressToAccount();
      await hydrateSignedInAccountToLocalState();
      setHasSignedOutLocally(false);
      hasPrefilledUsernameRef.current = true;
      notifyAccountStateChanged();
      setAuthNotice('Account created. Your current progress is now tied to this username.');
      setCreatePassword('');
    } catch (caughtError) {
      setAuthError(caughtError instanceof Error ? caughtError.message : 'Unable to create the account.');
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const handleEmailSignIn = async () => {
    if (!supabaseReady || isSigningIn) {
      return;
    }

    if (!signInIdentifier.trim() || !signInPassword) {
      setAuthError('Enter your email or username and password first.');
      return;
    }

    setIsSigningIn(true);
    setAuthError(null);
    setAuthNotice(null);
    setHasSignedOutLocally(false);

    try {
      const resolved = await resolveSignInIdentifier(signInIdentifier.trim());
      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: resolved.email,
        password: signInPassword,
      });

      if (signInError) {
        throw signInError;
      }

      await hydrateSignedInAccountToLocalState();
      setSignInPassword('');
      setAuthNotice('Signed in.');
    } catch (caughtError) {
      setAuthError(caughtError instanceof Error ? caughtError.message : 'Unable to sign in.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabaseReady || isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    setAuthError(null);
    setAuthNotice(null);

    try {
      await prepareSignedInSessionForSignOut();
      const supabase = getSupabaseBrowserClient();
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        throw signOutError;
      }

      resetLocalStateForGuestSession();
      setHasSignedOutLocally(true);
      void refreshAccountState();
      hasPrefilledUsernameRef.current = false;
      setCreateEmail('');
      setCreatePassword('');
      setSignInIdentifier('');
      setSignInPassword('');
      setAuthNotice('Signed out.');
    } catch (caughtError) {
      setAuthError(caughtError instanceof Error ? caughtError.message : 'Unable to sign out.');
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!effectiveAccountEmail || issues.length > 0 || available === false || !value.trim()) {
      return;
    }

    setIsSavingProfile(true);
    setAuthError(null);
    setAuthNotice(null);

    try {
      const response = await saveProfile(value.trim());
      setValue(response.profile.username);
      notifyAccountStateChanged();
      setAuthNotice('Username saved to your account.');
    } catch (caughtError) {
      setAuthError(caughtError instanceof Error ? caughtError.message : 'Unable to save username.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const canSaveProfile = Boolean(
    effectiveAccountEmail
      && value.trim()
      && issues.length === 0
      && !isChecking
      && available !== false
      && normalizedUsername !== savedUsername?.toLowerCase()
  );

  const statusMessage = !value.trim()
    ? 'Pick the username people will see in leaderboards and account screens.'
    : issues.length > 0
      ? 'That name breaks one or more rules.'
      : isChecking
        ? 'Checking availability...'
        : available === true
          ? 'That username is available.'
          : available === false
            ? 'That username is already taken or blocked.'
            : supabaseReady
              ? 'Availability is unknown right now. Check your connection or Supabase configuration.'
              : 'Rules passed. Live availability will start once Supabase is configured.';

  return (
    <section>
      <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-semibold">
        Account
      </h2>
      <div className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4">
        <p className="text-sm leading-6 text-[var(--color-muted)]">
          {effectiveAccountEmail && effectiveSavedUsername
            ? 'Welcome back and happy real fake birding.'
            : 'Create an account with a username, email, and password. After that, you can sign in with either your email or username.'}
        </p>

        <div className="mt-4 rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] p-3">
          {effectiveAccountEmail && effectiveSavedUsername ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{effectiveSavedUsername}</p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">{effectiveAccountEmail}</p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="inline-flex min-w-[8rem] items-center justify-center rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSigningOut ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          ) : !effectiveAccountEmail && isLoadingAccount && !hasSignedOutLocally ? (
            <p className="text-sm text-[var(--color-muted)]">Checking account status...</p>
          ) : !effectiveAccountEmail ? (
            <>
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-1">
                <button
                  type="button"
                  onClick={() => setAuthMode('create')}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    authMode === 'create'
                      ? 'bg-[var(--color-secondary)] text-[var(--color-on-secondary)]'
                      : 'text-[var(--color-text)]'
                  }`}
                >
                  Create account
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('sign-in')}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    authMode === 'sign-in'
                      ? 'bg-[var(--color-secondary)] text-[var(--color-on-secondary)]'
                      : 'text-[var(--color-text)]'
                  }`}
                >
                  Sign in
                </button>
              </div>

              {authMode === 'create' ? (
                <form className="contents" onKeyDown={handleCreateAccountKeyDown} onSubmit={handleCreateAccountSubmit}>
                  <div className="mt-4">
                    <p className="text-sm font-semibold">Create account</p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      Choose the username that will show up in the app, then add your email and password.
                    </p>
                  </div>

                  <label className="mt-4 block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                      Username
                    </span>
                    <input
                      type="text"
                      value={value}
                      onChange={(event) => setValue(event.target.value)}
                      placeholder="BirdFan_17"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className="w-full rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-secondary)]"
                    />
                  </label>

                  <div className="mt-4 flex items-start gap-2 text-sm">
                    {isChecking ? (
                      <LoaderCircle size={16} className="mt-0.5 shrink-0 animate-spin text-[var(--color-secondary)]" />
                    ) : issues.length > 0 || error ? (
                      <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-400" />
                    ) : (
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                    )}
                    <div>
                      <p>{error ?? statusMessage}</p>
                      {normalizedUsername ? (
                        <p className="mt-1 text-xs text-[var(--color-muted)]">
                          Canonical username: {normalizedUsername}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {issues.length > 0 ? (
                    <ul className="mt-3 space-y-1 text-xs text-red-300">
                      {issues.map((issue) => (
                        <li key={issue}>- {issue.replace(/_/g, ' ')}</li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="mt-4 rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-3">
                    <button
                      type="button"
                      onClick={() => setShowUsernameRules((current) => !current)}
                      className="flex w-full items-center justify-between gap-2 text-left text-sm font-semibold"
                    >
                      <span className="flex items-center gap-2">
                        <ShieldCheck size={16} className="text-[var(--color-secondary)]" />
                        Username rules
                      </span>
                      <ChevronDown
                        size={16}
                        className={`transition-transform ${showUsernameRules ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {showUsernameRules ? (
                      <ul className="mt-2 space-y-1 text-sm text-[var(--color-muted)]">
                        {usernameGuidance.map((item) => (
                          <li key={item}>- {item}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3">
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                        Email
                      </span>
                      <input
                        type="email"
                        value={createEmail}
                        onChange={(event) => setCreateEmail(event.target.value)}
                        placeholder="birdfan@example.com"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        className="w-full rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-secondary)]"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                        Password
                      </span>
                      <input
                        type="password"
                        value={createPassword}
                        onChange={(event) => setCreatePassword(event.target.value)}
                        placeholder="At least 8 characters"
                        className="w-full rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-secondary)]"
                      />
                    </label>

                    <button
                      type="submit"
                      onClick={handleCreateAccount}
                      disabled={!supabaseReady || isCreatingAccount || isSigningIn}
                      className="inline-flex items-center justify-center rounded-full bg-[var(--color-secondary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-secondary)] transition disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isCreatingAccount ? 'Creating account...' : 'Create account'}
                    </button>
                  </div>
                </form>
              ) : (
                <form className="contents" onKeyDown={handleSignInKeyDown} onSubmit={handleSignInSubmit}>
                  <div className="mt-4">
                    <p className="text-sm font-semibold">Sign in</p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      Use the email you signed up with, or use your username instead. Your username is what other players will see.
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                        Email or username
                      </span>
                      <input
                        type="text"
                        value={signInIdentifier}
                        onChange={(event) => setSignInIdentifier(event.target.value)}
                        placeholder="birdfan@example.com or BirdFan_17"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        className="w-full rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-secondary)]"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                        Password
                      </span>
                      <input
                        type="password"
                        value={signInPassword}
                        onChange={(event) => setSignInPassword(event.target.value)}
                        placeholder="Your password"
                        className="w-full rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-secondary)]"
                      />
                    </label>

                    <button
                      type="submit"
                      onClick={handleEmailSignIn}
                      disabled={!supabaseReady || isSigningIn || isCreatingAccount}
                      className="inline-flex items-center justify-center rounded-full bg-[var(--color-secondary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-secondary)] transition disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSigningIn ? 'Signing in...' : 'Sign in'}
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : null}

          {authError ? (
            <p className="mt-3 text-xs text-red-300">{authError}</p>
          ) : null}
          {authNotice ? (
            <p className="mt-3 text-xs text-emerald-300">{authNotice}</p>
          ) : null}
          {effectiveAccountEmail && !effectiveSavedUsername ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Legacy account needs a username</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      This account was created before usernames were required. Pick a public username to finish migrating it.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={!canSaveProfile || isSavingProfile}
                    className="inline-flex min-w-[8rem] items-center justify-center rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSavingProfile ? 'Saving...' : 'Save username'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}