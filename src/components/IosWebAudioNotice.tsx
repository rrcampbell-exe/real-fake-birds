'use client';

import { useEffect, useState } from 'react';
import { Volume2, X } from 'lucide-react';
import { useStoredBoolean } from '@/hooks/useStoredValue';
import { setStoredBoolean } from '@/lib/utils/player-progress';

export const IOS_WEB_AUDIO_NOTICE_DISMISSED_STORAGE_KEY = 'iosWebAudioNoticeDismissed';

function isIosWebBrowser(): boolean {
  if (typeof window === 'undefined') return false;

  const { userAgent, platform, maxTouchPoints } = window.navigator;
  const isIosDevice = /iPad|iPhone|iPod/.test(userAgent)
    || (platform === 'MacIntel' && maxTouchPoints > 1);

  if (!isIosDevice) return false;

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

  return !isStandalone;
}

export default function IosWebAudioNotice() {
  const dismissed = useStoredBoolean(IOS_WEB_AUDIO_NOTICE_DISMISSED_STORAGE_KEY, false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    setShouldRender(isIosWebBrowser());
  }, []);

  if (!shouldRender || dismissed) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 top-3 z-[60] md:top-4 md:left-1/2 md:right-auto md:w-full md:max-w-xl md:-translate-x-1/2">
      <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)]/95 p-4 shadow-[var(--shadow-card)] backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-[var(--color-secondary)]/15 p-2 text-[var(--color-secondary)]">
            <Volume2 size={18} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--color-text)]">
              iPhone web audio tip
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">
              Safari and Chrome on iPhone respect Silent Mode. If you do not hear music or sound effects, turn Silent Mode off.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setStoredBoolean(IOS_WEB_AUDIO_NOTICE_DISMISSED_STORAGE_KEY, true)}
            className="rounded-full p-1 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            aria-label="Dismiss iPhone audio notice"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}