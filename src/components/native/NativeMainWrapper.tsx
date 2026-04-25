'use client';

import { useEffect, useState } from 'react';
import { isNativePlatform } from '@/lib/native/platform';

export default function NativeMainWrapper({ children }: { children: React.ReactNode }) {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    const native = isNativePlatform();
    // eslint-disable-next-line no-console
    console.log('[native] isNativePlatform:', native, 'window.Capacitor:', (window as Window & { Capacitor?: unknown }).Capacitor);
    setIsNative(native);
  }, []);

  return (
    <main
      className={`app-main-content flex flex-1 flex-col pt-[env(safe-area-inset-top)] md:pt-0 ${
        isNative
          ? 'pb-[calc(env(safe-area-inset-bottom)+3rem)]'
          : 'pb-16 md:pb-0'
      }`}
    >
      {children}
    </main>
  );
}
