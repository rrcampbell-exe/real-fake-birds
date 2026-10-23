'use client';

import { apiFetch } from '@/lib/api/client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Ban, Flag, MoreHorizontal, ShieldAlert, X } from 'lucide-react';
import {
  PROFILE_REPORT_NOTE_MAX_LENGTH,
  PROFILE_REPORT_REASONS,
  type ProfileReportReason,
} from '@/lib/profile-reports';
import type { ProfileBlockState } from '@/types/profile';

const REPORT_REASON_LABELS: Record<ProfileReportReason, { label: string; detail: string }> = {
  harassment: {
    label: 'Harassment',
    detail: 'Bullying, threats, or targeted abuse.',
  },
  spam: {
    label: 'Spam',
    detail: 'Repeated junk, scams, or disruptive promotion.',
  },
  impersonation: {
    label: 'Impersonation',
    detail: 'Pretending to be another person or account.',
  },
  inappropriate_profile: {
    label: 'Inappropriate profile',
    detail: 'Offensive name, avatar, or profile content.',
  },
  other: {
    label: 'Other',
    detail: 'Anything else that should be reviewed.',
  },
};

interface ProfileSafetyActionsProps {
  targetUsername: string;
  blockState: ProfileBlockState;
  onBlocked: () => void;
  onUnblocked: () => Promise<void>;
}

type FeedbackState =
  | { tone: 'success'; message: string }
  | { tone: 'error'; message: string }
  | null;

function mapBlockError(code: string | null, action: 'block' | 'unblock'): string {
  if (code === 'target_not_found') {
    return 'That player profile could not be found.';
  }
  if (code === 'cannot_self_action') {
    return action === 'block'
      ? 'You cannot block your own profile.'
      : 'You cannot unblock your own profile.';
  }
  if (code === 'unauthenticated') {
    return 'Please sign in to manage blocks.';
  }
  if (code === 'rate_limited') {
    return 'Too many safety actions. Please wait a moment and try again.';
  }
  if (code === 'database_error' || code === 'service_unavailable') {
    return 'The safety service is unavailable right now. Please try again.';
  }

  return action === 'block'
    ? 'Unable to block this player right now. Please try again.'
    : 'Unable to unblock this player right now. Please try again.';
}

function mapReportError(code: string | null): string {
  if (code === 'target_not_found') {
    return 'That player profile could not be found.';
  }
  if (code === 'cannot_self_action') {
    return 'You cannot report your own profile.';
  }
  if (code === 'unauthenticated') {
    return 'Please sign in to report players.';
  }
  if (code === 'rate_limited') {
    return 'Too many reports were sent too quickly. Please wait and try again.';
  }
  if (code === 'invalid_request_body') {
    return 'Please choose a reason before sending your report.';
  }
  if (code === 'database_error' || code === 'service_unavailable') {
    return 'Reporting is unavailable right now. Please try again.';
  }

  return 'Unable to submit your report right now. Please try again.';
}

export default function ProfileSafetyActions({
  targetUsername,
  blockState,
  onBlocked,
  onUnblocked,
}: ProfileSafetyActionsProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isBlockPending, setIsBlockPending] = useState(false);
  const [isReportPending, setIsReportPending] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [reportReason, setReportReason] = useState<ProfileReportReason>('harassment');
  const [reportNote, setReportNote] = useState('');
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const isBlockedByViewer = blockState === 'viewer_blocked_target';
  const activeDialog = isBlockDialogOpen || isReportDialogOpen;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (
        target
        && !menuRef.current?.contains(target)
        && !triggerRef.current?.contains(target)
      ) {
        setIsMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!activeDialog) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isBlockPending && !isReportPending) {
        setIsBlockDialogOpen(false);
        setIsReportDialogOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [activeDialog, isBlockPending, isReportPending]);

  const actionCopy = useMemo(() => {
    if (isBlockedByViewer) {
      return {
        label: 'Unblock player',
        title: `Unblock @${targetUsername}?`,
        description: 'This player will be able to appear in your social surfaces again if nothing else prevents it.',
        confirmLabel: 'Unblock',
      };
    }

    return {
      label: 'Block player',
      title: `Block @${targetUsername}?`,
      description: 'Blocking removes social interaction and hides this player from search and related social surfaces.',
      confirmLabel: 'Block player',
    };
  }, [isBlockedByViewer, targetUsername]);

  async function handleConfirmBlockAction() {
    const action = isBlockedByViewer ? 'unblock' : 'block';
    setIsBlockPending(true);
    setFeedback(null);

    try {
      const response = await apiFetch('/api/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetUsername }),
      });

      if (!response.ok) {
        let errorCode: string | null = null;
        try {
          const errorData = (await response.json()) as { error?: string };
          errorCode = typeof errorData.error === 'string' ? errorData.error : null;
        } catch {
          errorCode = null;
        }

        setFeedback({ tone: 'error', message: mapBlockError(errorCode, action) });
        return;
      }

      if (action === 'block') {
        onBlocked();
        setFeedback({ tone: 'success', message: `@${targetUsername} has been blocked.` });
      } else {
        await onUnblocked();
        setFeedback({ tone: 'success', message: `@${targetUsername} has been unblocked.` });
      }

      setIsBlockDialogOpen(false);
      setIsMenuOpen(false);
    } catch {
      setFeedback({ tone: 'error', message: mapBlockError(null, action) });
    } finally {
      setIsBlockPending(false);
    }
  }

  async function handleSubmitReport() {
    setIsReportPending(true);
    setFeedback(null);

    try {
      const response = await apiFetch('/api/report/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUsername,
          reason: reportReason,
          note: reportNote.trim() || null,
        }),
      });

      if (!response.ok) {
        let errorCode: string | null = null;
        try {
          const errorData = (await response.json()) as { error?: string };
          errorCode = typeof errorData.error === 'string' ? errorData.error : null;
        } catch {
          errorCode = null;
        }

        setFeedback({ tone: 'error', message: mapReportError(errorCode) });
        return;
      }

      setIsReportDialogOpen(false);
      setIsMenuOpen(false);
      setReportReason('harassment');
      setReportNote('');
      setFeedback({ tone: 'success', message: 'Thanks. Your report was submitted for review.' });
    } catch {
      setFeedback({ tone: 'error', message: mapReportError(null) });
    } finally {
      setIsReportPending(false);
    }
  }

  function closeDialogs() {
    if (isBlockPending || isReportPending) {
      return;
    }
    setIsBlockDialogOpen(false);
    setIsReportDialogOpen(false);
  }

  const dialogPortal = isMounted && activeDialog
    ? createPortal(
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 px-3 py-5 backdrop-blur-sm"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeDialogs();
          }
        }}
      >
        {isBlockDialogOpen ? (
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-block-dialog-title"
            className="w-full max-w-md overflow-hidden rounded-[1.75rem] border border-amber-200/20 bg-[color-mix(in_srgb,var(--color-primary)_76%,black)] shadow-2xl"
          >
            <div className="border-b border-white/10 px-5 pb-4 pt-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-amber-200">
                    <ShieldAlert size={14} />
                    Safety action
                  </div>
                  <div>
                    <h2
                      id="profile-block-dialog-title"
                      className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-text)]"
                    >
                      {actionCopy.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                      {actionCopy.description}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeDialogs}
                  disabled={isBlockPending}
                  aria-label="Close block confirmation"
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-[var(--color-text)] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="space-y-3 px-5 py-5">
              {!isBlockedByViewer ? (
                <div className="rounded-2xl border border-amber-300/15 bg-amber-500/8 px-4 py-3 text-sm leading-6 text-amber-50/90">
                  This player will no longer be able to follow, search for, or interact socially with you through supported profile surfaces.
                </div>
              ) : null}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeDialogs}
                  disabled={isBlockPending}
                  className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-medium text-[var(--color-muted)] transition hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBlockAction}
                  disabled={isBlockPending}
                  className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    isBlockedByViewer
                      ? 'border border-[var(--color-secondary)] bg-[color-mix(in_srgb,var(--color-secondary)_14%,var(--color-surface))] text-[var(--color-secondary)] hover:bg-[color-mix(in_srgb,var(--color-secondary)_22%,var(--color-surface))]'
                      : 'border border-red-400/20 bg-red-500/90 text-white hover:bg-red-500'
                  }`}
                >
                  {isBlockPending ? 'Saving...' : actionCopy.confirmLabel}
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-report-dialog-title"
            className="flex w-full max-w-xl min-w-0 flex-col overflow-hidden rounded-[1.75rem] border border-[var(--color-surface-border)] bg-[color-mix(in_srgb,var(--color-primary)_78%,black)] shadow-2xl"
            style={{ maxHeight: 'min(85svh, 720px)' }}
          >
            <div className="shrink-0 border-b border-white/10 px-5 pb-4 pt-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-red-300/15 bg-red-500/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-red-100">
                    <Flag size={14} />
                    Report profile
                  </div>
                  <div>
                    <h2
                      id="profile-report-dialog-title"
                      className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-text)]"
                    >
                      Report @{targetUsername}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                      Choose the closest reason. Your report is stored for manual review.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeDialogs}
                  disabled={isReportPending}
                  aria-label="Close report dialog"
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-[var(--color-text)] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div
              data-testid="profile-report-dialog-content"
              className="overflow-y-auto px-5 py-5"
            >
              <div className="space-y-5">
              <div className="grid gap-2.5">
                {PROFILE_REPORT_REASONS.map((reason) => {
                  const selected = reportReason === reason;
                  const details = REPORT_REASON_LABELS[reason];
                  return (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setReportReason(reason)}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        selected
                          ? 'border-red-300/25 bg-red-500/10 shadow-[0_0_0_1px_rgba(248,113,113,0.18)]'
                          : 'border-[var(--color-surface-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--color-text)]">
                            {details.label}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">
                            {details.detail}
                          </p>
                        </div>
                        <span
                          className={`mt-0.5 h-4 w-4 rounded-full border ${
                            selected
                              ? 'border-red-300/30 bg-red-400 shadow-[inset_0_0_0_3px_rgba(16,16,16,0.55)]'
                              : 'border-[var(--color-surface-border)] bg-transparent'
                          }`}
                          aria-hidden="true"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--color-text)]">
                  Optional note
                </span>
                <textarea
                  value={reportNote}
                  onChange={(event) => setReportNote(event.target.value.slice(0, PROFILE_REPORT_NOTE_MAX_LENGTH))}
                  rows={4}
                  className="w-full rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-red-300/20 focus:bg-[var(--color-surface-hover)]"
                  placeholder="Add context that would help a moderator review this report."
                />
                <span className="mt-2 block text-right text-[0.7rem] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  {PROFILE_REPORT_NOTE_MAX_LENGTH - reportNote.length} characters left
                </span>
              </label>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[0.72rem] font-medium text-[var(--color-muted)]">
                  <AlertTriangle size={13} />
                  Reports do not notify the other player.
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={closeDialogs}
                    disabled={isReportPending}
                    className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-medium text-[var(--color-muted)] transition hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitReport}
                    disabled={isReportPending}
                    className="rounded-2xl border border-red-300/20 bg-red-500/90 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isReportPending ? 'Sending...' : 'Submit report'}
                  </button>
                </div>
              </div>
              </div>
            </div>
          </section>
        )}
      </div>,
      document.body,
    )
    : null;

  return (
    <>
      <div className="relative flex flex-col items-end gap-2">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          aria-label="Open profile safety actions"
          onClick={() => {
            setFeedback(null);
            setIsMenuOpen((current) => !current);
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-surface-border)] bg-[color-mix(in_srgb,var(--color-surface)_84%,transparent)] text-[var(--color-text)] shadow-sm transition hover:bg-[var(--color-surface-hover)]"
        >
          <MoreHorizontal size={16} />
        </button>

        {isMenuOpen ? (
          <div
            ref={menuRef}
            role="menu"
            className="absolute right-0 top-10 z-20 w-64 overflow-hidden rounded-3xl border border-white/10 bg-[color-mix(in_srgb,var(--color-primary)_82%,black)] p-2 shadow-2xl"
          >
            <div className="rounded-[1.35rem] border border-white/8 bg-white/5 p-2">
              <div className="px-2 pb-2 pt-1">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  Safety actions
                </p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsBlockDialogOpen(true);
                }}
                className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
                  isBlockedByViewer
                    ? 'bg-[color-mix(in_srgb,var(--color-secondary)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-secondary)_16%,transparent)]'
                    : 'bg-red-500/8 hover:bg-red-500/14'
                }`}
              >
                <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
                  isBlockedByViewer
                    ? 'border border-[var(--color-secondary)]/20 bg-[var(--color-secondary)]/12 text-[var(--color-secondary)]'
                    : 'border border-red-300/15 bg-red-500/15 text-red-100'
                }`}
                >
                  <Ban size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[var(--color-text)]">
                    {actionCopy.label}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--color-muted)]">
                    {isBlockedByViewer
                      ? 'Re-allow this player to find your profile and interact socially.'
                      : 'This player won\'t be able to follow you, see your profile, or interact socially.'}
                  </span>
                </span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsReportDialogOpen(true);
                }}
                className="mt-1 flex w-full items-start gap-3 rounded-2xl bg-white/4 px-3 py-3 text-left transition hover:bg-white/8"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-red-300/15 bg-red-500/10 text-red-100">
                  <Flag size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[var(--color-text)]">
                    Report profile
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--color-muted)]">
                    Send this profile to moderation review with a reason and optional note.
                  </span>
                </span>
              </button>
            </div>
          </div>
        ) : null}

        {feedback ? (
          <p
            className={`max-w-[15rem] text-right text-[0.72rem] leading-5 ${
              feedback.tone === 'error' ? 'text-red-300' : 'text-[var(--color-muted)]'
            }`}
          >
            {feedback.message}
          </p>
        ) : null}
      </div>
      {dialogPortal}
    </>
  );
}
