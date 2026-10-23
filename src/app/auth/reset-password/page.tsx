'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const supabaseReady = hasSupabaseEnv();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let isActive = true;

    const checkRecoverySession = async () => {
      if (!supabaseReady) {
        setSessionError('Password recovery is unavailable right now.');
        setIsCheckingSession(false);
        return;
      }

      try {
        const { data, error } = await getSupabaseBrowserClient().auth.getSession();
        if (error) {
          throw error;
        }

        if (isActive) {
          setHasSession(Boolean(data.session));
          setIsCheckingSession(false);
        }
      } catch (caughtError) {
        if (isActive) {
          setSessionError(caughtError instanceof Error ? caughtError.message : 'Unable to verify this reset link.');
          setIsCheckingSession(false);
        }
      }
    };

    void checkRecoverySession();
    return () => {
      isActive = false;
    };
  }, [supabaseReady]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasSession || isSaving) {
      return;
    }

    if (password.length < 8 || password.length > 128) {
      setFormError('Use a password between 8 and 128 characters.');
      return;
    }

    if (password !== passwordConfirm) {
      setFormError('The passwords do not match.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const { error } = await getSupabaseBrowserClient().auth.updateUser({ password });
      if (error) {
        throw error;
      }

      setIsComplete(true);
      setPassword('');
      setPasswordConfirm('');
    } catch (caughtError) {
      setFormError(caughtError instanceof Error ? caughtError.message : 'Unable to update your password.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[65vh] w-full max-w-lg items-center px-4 py-10">
      <section className="w-full overflow-hidden rounded-3xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] shadow-xl shadow-black/10">
        <div className="border-b border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] px-6 py-7 sm:px-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-secondary)] text-[var(--color-on-secondary)]">
            {isComplete ? <CheckCircle2 size={24} aria-hidden="true" /> : <KeyRound size={24} aria-hidden="true" />}
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
            Account access
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-text)]">
            {isComplete ? 'Password updated' : 'Choose a new password'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
            {isComplete
              ? 'Your new password is ready. Use it the next time you sign in.'
              : 'Set a new password for your Real Fake Birds account.'}
          </p>
        </div>

        <div className="px-6 py-6 sm:px-8">
          {isCheckingSession ? (
            <p className="text-sm text-[var(--color-muted)]" role="status">Checking your reset link…</p>
          ) : isComplete ? (
            <Link
              href="/settings"
              className="inline-flex items-center justify-center rounded-full bg-[var(--color-secondary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-on-secondary)] transition hover:brightness-95"
            >
              Continue to settings
            </Link>
          ) : sessionError ? (
            <div className="space-y-4">
              <p className="text-sm leading-6 text-[var(--color-error)]" role="alert">{sessionError}</p>
              <Link
                href="/settings"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text)] underline decoration-[var(--color-surface-border)] underline-offset-4"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Back to account
              </Link>
            </div>
          ) : !hasSession ? (
            <div className="space-y-4">
              <p className="text-sm leading-6 text-[var(--color-error)]" role="alert">
                This reset link is invalid or has expired. Request a new one from the sign-in form.
              </p>
              <Link
                href="/settings"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text)] underline decoration-[var(--color-surface-border)] underline-offset-4"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Back to account
              </Link>
            </div>
          ) : (
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  New password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                  className="w-full rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] px-4 py-3 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-secondary)]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  Confirm new password
                </span>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(event) => setPasswordConfirm(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                  className="w-full rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] px-4 py-3 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-secondary)]"
                />
              </label>

              {formError ? <p className="text-sm text-[var(--color-error)]" role="alert">{formError}</p> : null}

              <p className="text-xs leading-5 text-[var(--color-muted)]">Use 8 to 128 characters.</p>
              <button
                type="submit"
                disabled={isSaving}
                className="mt-1 inline-flex items-center justify-center rounded-full bg-[var(--color-secondary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-on-secondary)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? 'Updating password…' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
