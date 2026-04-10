'use client';

import { useState } from 'react';
import { Check, LoaderCircle, Share2 } from 'lucide-react';
import { track } from '@/lib/analytics';
import { sharePayload as sharePayloadWithImage } from '@/lib/share/share-with-image';
import type { ShareImageParams, SharePayload } from '@/types';

interface ShareButtonProps {
  payload: SharePayload;
  eventLabel: string;
  imageParams?: ShareImageParams;
  className?: string;
}

export default function ShareButton({ payload, eventLabel, imageParams, className = '' }: ShareButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'copied'>('idle');

  const handleShare = async () => {
    setStatus('loading');

    try {
      const method = await sharePayloadWithImage(payload, imageParams);

      if (!method) {
        setStatus('idle');
        return;
      }

      track('share_created', { label: eventLabel, method });

      if (method === 'clipboard') {
        setStatus('copied');
        window.setTimeout(() => setStatus('idle'), 1800);
        return;
      }

      setStatus('idle');
    } catch {
      setStatus('idle');
    }
  };

  const isLoading = status === 'loading';
  const isCopied = status === 'copied';

  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={() => {
        void handleShare();
      }}
      className={`inline-flex items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface-hover)] disabled:opacity-70 ${className}`}
    >
      {isLoading ? <LoaderCircle size={14} className="animate-spin" /> : isCopied ? <Check size={14} /> : <Share2 size={14} />}
      {isLoading ? 'Preparing...' : isCopied ? 'Copied' : 'Share'}
    </button>
  );
}