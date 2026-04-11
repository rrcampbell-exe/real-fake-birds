'use client';

import { useEffect, useRef } from 'react';
import { track } from '@/lib/analytics';

/**
 * Fires a single `screen_viewed` event on mount for the given screen name.
 * The event only fires once per component mount (not on re-renders).
 */
export function useScreenViewed(screenName: string): void {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) {
      return;
    }
    firedRef.current = true;
    track('screen_viewed', { screen: screenName });
  }, [screenName]);
}
