'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="box-border flex min-h-[calc(100dvh-7rem)] flex-1 items-center justify-center px-4 py-6 md:min-h-0 md:py-4">
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-6 text-center backdrop-blur-sm"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <div className="mb-3 h-1 rounded-full bg-[var(--color-secondary)]" />
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
              Hmm. The birds have gone quiet.
            </h1>
            <p className="mt-3 text-sm text-[var(--color-muted)]">
              Something slipped out of formation. Give the flock a moment, then try again.
            </p>
            <button
              onClick={this.handleReload}
              className="mt-5 rounded-xl bg-[var(--color-secondary)] px-6 py-3 font-[family-name:var(--font-display)] font-semibold text-[var(--color-on-secondary)] shadow-[var(--shadow-button)] transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
            >
              Rustle Them Up
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}