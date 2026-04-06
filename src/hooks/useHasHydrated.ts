'use client';

import { useSyncExternalStore } from 'react';

function subscribe() {
  return () => {};
}

export function useHasHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}