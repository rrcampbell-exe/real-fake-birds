'use client';

import { useEffect, useRef, useState } from 'react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { AlertCircle, CheckCircle2, ChevronDown, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useAccountState } from '@/components/account/AccountStateProvider';
import {
  registerAccount,
  signInWithUsername,
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

interface UsernameAvailabilityCardProps {
  compact?: boolean;
  onAuthSuccess?: () => void;
}

export default function UsernameAvailabilityCard({
  compact = false,
  onAuthSuccess,
}: UsernameAvailabilityCardProps) {
  const supabaseReady = hasSupabaseEnv();
  const {
    isLoadingAccount,
    isSignedIn,
    accountEmail,
    accountUsername,
    refreshAccountState,
  } = useAccountState();
  const { value, normalizedUsername, issues, available, isChecking, error, setValue } = useUsernameValidation();
  const usernameValueRef = useRef(value);
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const hasPrefilledUsernameRef = useRef(false);
  const [authMode, setAuthMode] = useState<'create' | 'sign-in'>('create');
  const [createPassword, setCreatePassword] = useState('');
  const [createPasswordConfirm, setCreatePasswordConfirm] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [signInIdentifier, setSignInIdentifier] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [showUsernameRules, setShowUsernameRules] = useState(false);
  const [hasSignedOutLocally, setHasSignedOutLocally] = useState(false);
  const savedUsername = accountUsername;
  const effectiveIsSignedIn = hasSignedOutLocally ? false : isSignedIn;
  const effectiveAccountEmail = hasSignedOutLocally ? null : accountEmail;
  const effectiveSavedUsername = hasSignedOutLocally ? null : savedUsername;
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? '';
  const isCaptchaEnabled = turnstileSiteKey.length > 0;

  useEffect(() => {
    usernameValueRef.current = value;
  }, [value]);

  useEffect(() => {
    setAuthError(null);
  }, [authMode]);

  useEffect(() => {
    if (authMode !== 'create') {
      setCaptchaToken(null);
      turnstileRef.current?.reset();
    }
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
    if (!effectiveIsSignedIn) {
      hasPrefilledUsernameRef.current = false;
      return;
    }

    if (!usernameValueRef.current.trim() && accountUsername && !hasPrefilledUsernameRef.current) {
      hasPrefilledUsernameRef.current = true;
      setValue(accountUsername);
    }
  }, [accountUsername, effectiveIsSignedIn, setValue]);

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

    if (!createPassword || !createPasswordConfirm) {
      setAuthError('Enter a username, password, and password confirmation first.');
      return;
    }

    if (!value.trim()) {
      if (!compact) {
        setShowUsernameRules(true);
      }
      setAuthError('Choose a username before creating an account.');
      return;
    }

    if (issues.length > 0 || available === false) {
      if (!compact) {
        setShowUsernameRules(true);
      }
      setAuthError('Pick an available username before creating your account.');
      return;
    }

    if (createPassword !== createPasswordConfirm) {
      setAuthError('Passwords do not match.');
      return;
    }

    if (isCaptchaEnabled && !captchaToken) {
      setAuthError('Complete the quick human check before creating your account.');
      return;
    }

    setIsCreatingAccount(true);
    setAuthError(null);
    setAuthNotice(null);
    setHasSignedOutLocally(false);

    try {
      const supabase = getSupabaseBrowserClient();
      const response = await registerAccount({
        username: value.trim(),
        password: createPassword,
        captchaToken: captchaToken ?? undefined,
      });

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: response.session.accessToken,
        refresh_token: response.session.refreshToken,
      });

      if (sessionError) {
        throw sessionError;
      }

      setCreatePassword('');
      setCreatePasswordConfirm('');
      setSignInPassword('');
      await hydrateSignedInAccountToLocalState();
      await pushCurrentLocalProgressToAccount();
      await refreshAccountState();
      setAuthNotice('Account created and signed in.');
      onAuthSuccess?.();
    } catch (caughtError) {
      setAuthError(caughtError instanceof Error ? caughtError.message : 'Unable to create the account.');
    } finally {
      if (isCaptchaEnabled) {
        setCaptchaToken(null);
        turnstileRef.current?.reset();
      }
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
      const supabase = getSupabaseBrowserClient();
      const identifier = signInIdentifier.trim();
      const signInError = identifier.includes('@')
        ? (await supabase.auth.signInWithPassword({
            email: identifier.toLowerCase(),
            password: signInPassword,
          })).error
        : (await (async () => {
            const response = await signInWithUsername(identifier, signInPassword);
            const { error } = await supabase.auth.setSession({
              access_token: response.session.accessToken,
              refresh_token: response.session.refreshToken,
            });
            return { error };
          })()).error;

      if (signInError) {
        throw signInError;
      }

      await hydrateSignedInAccountToLocalState();
      await refreshAccountState();
      setSignInPassword('');
      await pushCurrentLocalProgressToAccount();
      setAuthNotice('Signed in.');
      onAuthSuccess?.();
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
      setCreatePassword('');
      setCreatePasswordConfirm('');
      setSignInIdentifier('');
      setSignInPassword('');
      setAuthNotice('Signed out.');
    } catch (caughtError) {
      setAuthError(caughtError instanceof Error ? caughtError.message : 'Unable to sign out.');
    } finally {
      setIsSigningOut(false);
    }
  };

  const statusMessage = !value.trim()
    ? 'People will see your username on leaderboards and account screens.'
    : issues.length > 0
      ? 'That name breaks one or more rules.'
      : isChecking
        ? 'Checking availability...'
        : available === true
          ? 'That username is available.'
          : available === false
            ? 'That username is already taken or blocked.'
            : supabaseReady
              ? 'Availability is unknown right now. Check your connection or try again later.'
              : 'Rules passed. Live availability will start once Supabase is configured.';
    const outerContainerClassName = compact
      ? 'space-y-4'
      : 'space-y-4 rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4';
    const contentContainerClassName = 'space-y-4';
    const tabsClassName = compact
      ? 'grid grid-cols-2 gap-2 rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] p-1'
      : 'grid grid-cols-2 gap-2 rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-1';
    const usernameRulesClassName = compact
      ? 'mt-4 rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] p-3'
      : 'mt-4 rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-3';

  return (
    <section>
      {!compact ? (
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-semibold">
          Account
        </h2>
      ) : null}
      <div className={outerContainerClassName}>
        {!compact ? (
          <p className="text-sm leading-6 text-[var(--color-muted)]">
            {effectiveIsSignedIn
              ? `Welcome back${effectiveSavedUsername ? ', ' + effectiveSavedUsername + '!' : '!'} Happy real fake birding.`
              : 'Create an account with a public username and password.'}
          </p>
        ) : null}

        <div className={contentContainerClassName}>
          {effectiveIsSignedIn ? (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="inline-flex min-w-[8rem] items-center justify-center rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSigningOut ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          ) : !effectiveIsSignedIn && isLoadingAccount && !hasSignedOutLocally ? (
            <p className="text-sm text-[var(--color-muted)]">Checking account status...</p>
          ) : !effectiveIsSignedIn ? (
            <>
              <div className={tabsClassName}>
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
                      <AlertCircle size={16} className="mt-0.5 shrink-0 text-[var(--color-error)]" />
                    ) : (
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[var(--color-success)]" />
                    )}
                    <div>
                      <p>{error ?? statusMessage}</p>
                    </div>
                  </div>

                  {issues.length > 0 ? (
                    <ul className="mt-3 space-y-1 text-xs text-[var(--color-error)]">
                      {issues.map((issue) => (
                        <li key={issue}>- {issue.replace(/_/g, ' ')}</li>
                      ))}
                    </ul>
                  ) : null}

                  {!compact ? (
                    <div className={usernameRulesClassName}>
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
                  ) : null}

                  <div className="mt-4 grid gap-3">
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

                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                        Confirm password
                      </span>
                      <input
                        type="password"
                        value={createPasswordConfirm}
                        onChange={(event) => setCreatePasswordConfirm(event.target.value)}
                        placeholder="Re-enter your password"
                        className="w-full rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-secondary)]"
                      />
                    </label>

                    {isCaptchaEnabled ? (
                      <div className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                          Real Fake Human Check
                        </p>
                        <p className="mt-2 text-sm text-[var(--color-muted)]">
                          One quick check keeps bots out of the birdhouse.
                        </p>
                        <div className="mt-3 overflow-hidden rounded-lg">
                          <Turnstile
                            ref={turnstileRef}
                            siteKey={turnstileSiteKey}
                            options={{
                              action: 'register-account',
                              size: compact ? 'compact' : 'flexible',
                              theme: 'auto',
                            }}
                            onSuccess={(token) => {
                              setCaptchaToken(token);
                              setAuthError(null);
                            }}
                            onExpire={() => {
                              setCaptchaToken(null);
                              setAuthError('The human check expired. Please try again.');
                            }}
                            onError={() => {
                              setCaptchaToken(null);
                              setAuthError('The human check could not be verified right now. Please try again.');
                            }}
                            onUnsupported={() => {
                              setCaptchaToken(null);
                              setAuthError('This browser could not load the human check. Try another browser or disable extensions that block it.');
                            }}
                          />
                        </div>
                      </div>
                    ) : null}

                    <button
                      type="submit"
                      disabled={!supabaseReady || isCreatingAccount || isSigningIn || (isCaptchaEnabled && !captchaToken)}
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
                      Use your username to sign in.
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
                        placeholder="BirdFan_17 or birdfan@example.com"
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
            <p className="mt-3 text-xs text-[var(--color-error)]">{authError}</p>
          ) : null}
          {authNotice ? (
            <p className="mt-3 text-xs text-emerald-300">{authNotice}</p>
          ) : null}

        </div>
      </div>
    </section>
  );
}