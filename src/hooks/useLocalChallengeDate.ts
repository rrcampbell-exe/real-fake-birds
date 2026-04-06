'use client';

import { useEffect, useState } from 'react';
import { getTodayChallengeDate } from '@/lib/utils/daily-challenge';

function getNextMidnightDelayMs(now = new Date()): number {
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 50);
  return Math.max(nextMidnight.getTime() - now.getTime(), 50);
}

export function useLocalChallengeDate() {
  const [today, setToday] = useState(() => getTodayChallengeDate());

  useEffect(() => {
    let timeoutId: number | undefined;

    const refreshToday = () => {
      setToday((current) => {
        const next = getTodayChallengeDate();
        return current === next ? current : next;
      });
    };

    const scheduleMidnightCheck = () => {
      timeoutId = window.setTimeout(() => {
        refreshToday();
        scheduleMidnightCheck();
      }, getNextMidnightDelayMs());
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshToday();
      }
    };

    const handleFocus = () => {
      refreshToday();
    };

    const handlePageShow = () => {
      refreshToday();
    };

    scheduleMidnightCheck();
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }

      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return today;
}