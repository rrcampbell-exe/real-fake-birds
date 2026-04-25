'use client';

import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { track } from '@/lib/analytics';
import type { SharePayload } from '@/types';

interface ShareButtonProps {
  payload: SharePayload;
  eventLabel: string;
  className?: string;
}

export default function ShareButton({ payload, eventLabel, className = '' }: ShareButtonProps) {
  const [status, setStatus] = useState<'idle' | 'copied'>('idle');

  const handleShare = async () => {
    if (typeof window === 'undefined') {
      return;
    }

    const shareUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    const body = `${payload.text}\n${shareUrl}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: payload.title,
          text: body,
        });
        track('share_created', { label: eventLabel, method: 'native' });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(body);
        setStatus('copied');
        track('share_created', { label: eventLabel, method: 'clipboard' });
        window.setTimeout(() => setStatus('idle'), 1800);
      }
    } catch {
      setStatus('idle');
    }
  };

  return (
    <button
      type="button"
      onClick={() => {
        void handleShare();
      }}
      className={`inline-flex items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface-hover)] ${className}`}
    >
      {status === 'copied' ? <Check size={14} /> : <Share2 size={14} />}
      {status === 'copied' ? 'Copied' : 'Share'}
    </button>
  );
}