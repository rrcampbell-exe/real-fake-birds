'use client';

import { useHasHydrated } from '@/hooks/useHasHydrated';
import { isNativePlatform } from '@/lib/native/platform';

export default function NativeMainWrapper({ children }: { children: React.ReactNode }) {
  const hasHydrated = useHasHydrated();
  const isNative = hasHydrated && isNativePlatform();

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
