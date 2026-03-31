'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useSound } from '@/hooks/useSound';

export default function Error() {
  const { play } = useSound();

  useEffect(() => {
    play('error');
  }, [play]);

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div
        className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-surface-border)] backdrop-blur-sm p-8 flex flex-col items-center gap-4"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <AlertCircle size={40} className="text-red-400" />
        <p className="font-[family-name:var(--font-display)] text-lg font-medium">
          No birds found
        </p>
        <button
          onClick={() => { play('whoosh'); window.location.reload(); }}
          className="py-2.5 px-6 rounded-xl font-[family-name:var(--font-display)] font-semibold text-sm
            bg-[var(--color-secondary)] text-[var(--color-text)] border-none
            shadow-[var(--shadow-button)] hover:brightness-110 active:scale-[0.97]
            transition-all duration-150 cursor-pointer"
        >
          Look Again
        </button>
      </div>
    </div>
  );
}
