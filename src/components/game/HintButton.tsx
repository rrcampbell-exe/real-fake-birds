'use client';

import { Eye } from 'lucide-react';

interface HintButtonProps {
  disabled?: boolean;
  revealsRemaining?: number;
}

export default function HintButton({ disabled = true, revealsRemaining = 5 }: HintButtonProps) {
  return (
    <div className="relative group">
      <button
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
          bg-[var(--color-surface)] border border-[var(--color-surface-border)]
          text-[var(--color-muted)] cursor-not-allowed opacity-60
          transition-all"
      >
        <Eye size={14} />
        <span>Show Bird</span>
        <span className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${
                i < revealsRemaining
                  ? 'bg-[var(--color-secondary)]'
                  : 'bg-[var(--color-surface-border)]'
              }`}
            />
          ))}
        </span>
      </button>
      <div className="absolute top-full right-0 z-10 mt-2 w-44 rounded-lg border border-[var(--color-surface-border)]
        bg-[var(--color-primary-light)] px-3 py-2 text-left text-[0.65rem] leading-tight text-[var(--color-text)]
        opacity-0 shadow-[var(--shadow-card)] pointer-events-none transition-opacity duration-150 group-hover:opacity-100
        after:absolute after:-top-1 after:right-4 after:h-2 after:w-2 after:rotate-45 after:border-l after:border-t
        after:border-[var(--color-surface-border)] after:bg-[var(--color-primary-light)] after:content-['']">
        Show a picture of this bird — coming soon!
      </div>
    </div>
  );
}
