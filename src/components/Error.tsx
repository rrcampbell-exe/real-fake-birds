'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, WifiOff } from 'lucide-react';
import { track } from '@/lib/analytics';
import { useSound } from '@/hooks/useSound';

interface ErrorProps {
  onTryAgain: () => void;
}

export default function Error({ onTryAgain }: ErrorProps) {
  const { play } = useSound();
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    play('error');
    track('error_displayed', { error_type: isOffline ? 'offline' : 'server' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div
        className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-surface-border)] backdrop-blur-sm p-8 flex flex-col items-center gap-4"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        {isOffline ? (
          <WifiOff size={40} className="text-[var(--color-error)]" />
        ) : (
          <AlertCircle size={40} className="text-[var(--color-error)]" />
        )}
        <p className="font-[family-name:var(--font-display)] text-lg font-medium text-center">
          {isOffline ? "You're offline. Check your connection." : 'No birds found'}
        </p>
        <button
          onClick={() => {
            play('whoosh');
            track('retry_attempted');
            onTryAgain();
          }}
          className="py-2.5 px-6 rounded-xl font-[family-name:var(--font-display)] font-semibold text-sm
            bg-[var(--color-secondary)] text-[var(--color-on-secondary)] border-none
            shadow-[var(--shadow-button)] hover:brightness-110 active:scale-[0.97]
            transition-all duration-150 cursor-pointer"
        >
          {isOffline ? 'Try Again' : 'Look Again'}
        </button>
      </div>
    </div>
  );
}
