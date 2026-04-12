'use client';

import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

interface RouteErrorFallbackProps {
  reset: () => void;
}

export default function RouteErrorFallback({ reset }: RouteErrorFallbackProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-8 text-center backdrop-blur-sm"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <AlertCircle size={40} className="mx-auto text-[var(--color-error)]" />
        <h2 className="mt-4 font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-text)]">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          The birds got spooked. Try reloading this page.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-[var(--color-secondary)] px-6 py-2.5 font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--color-on-secondary)] shadow-[var(--shadow-button)] transition-all hover:brightness-110 active:scale-[0.97]"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] px-6 py-2.5 font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--color-text)] transition-all hover:brightness-95"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
