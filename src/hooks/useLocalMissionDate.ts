'use client';

import { useEffect, useState } from 'react';
import { getNextMissionMidnightDelayMs, getTodayMissionDate } from '@/lib/utils/daily-mission-date';

export function useLocalMissionDate() {
  const [today, setToday] = useState(() => getTodayMissionDate());

  useEffect(() => {
    let timeoutId: number | undefined;

    const refreshToday = () => {
      setToday((current) => {
        const next = getTodayMissionDate();
        return current === next ? current : next;
      });
    };

    const scheduleMidnightCheck = () => {
      timeoutId = window.setTimeout(() => {
        refreshToday();
        scheduleMidnightCheck();
      }, getNextMissionMidnightDelayMs());
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