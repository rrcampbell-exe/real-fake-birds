'use client';

import { useEffect } from 'react';
import { getTheme } from '@/lib/utils/theme-handler';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const theme = getTheme();
    document.documentElement.setAttribute('data-theme', theme.name);
  }, []);

  return <>{children}</>;
}
