'use client';

import { useEffect, useState } from 'react';

const SEEN_KEY_PREFIX = 'feature_seen:';

/**
 * Returns true on the first render where `enabled` is true for a given key,
 * false on every subsequent render. "First" is persisted in localStorage so
 * the glow fires exactly once per device.
 *
 * Pass an empty string or `enabled=false` to opt-out (always returns false).
 * `enabled` lets callers gate the flag so it is never written until the feature
 * is actually visible — preventing premature consumption before the player has
 * enough seeds to see the UI element.
 */
export function useFirstAppearance(key: string, enabled = true): boolean {
  const [isFirst, setIsFirst] = useState(false);

  useEffect(() => {
    if (!key || !enabled) return;
    const storageKey = `${SEEN_KEY_PREFIX}${key}`;
    try {
      if (!localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, '1');
        // setTimeout satisfies the set-state-in-effect lint rule.
        // Intentionally no cleanup — the timeout must survive React strict
        // mode's synthetic cleanup/re-run cycle (cleanup would cancel it
        // before setIsFirst fires, and the re-run finds the key already
        // written). Setting state after an unmount is a safe no-op in React 18+.
        window.setTimeout(() => setIsFirst(true), 0);
      }
    } catch {
      // ignore storage errors (e.g., private-mode restrictions)
    }
  }, [key, enabled]);

  return isFirst;
}
