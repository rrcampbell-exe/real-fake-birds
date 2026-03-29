'use client';

import { useRef, useSyncExternalStore } from 'react';

const STORAGE_EVENT_NAME = 'real-fake-birds-storage';
const jsonSnapshotCache = new Map<string, { raw: string | null; value: unknown }>();
const booleanSnapshotCache = new Map<string, { raw: string | null; value: boolean }>();

function subscribeToKey(key: string, onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleStorage = (event: Event) => {
    if (event instanceof StorageEvent) {
      if (event.key === null || event.key === key) {
        onStoreChange();
      }
      return;
    }

    const customEvent = event as CustomEvent<{ key?: string }>;
    if (!customEvent.detail?.key || customEvent.detail.key === key) {
      onStoreChange();
    }
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener(STORAGE_EVENT_NAME, handleStorage as EventListener);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(STORAGE_EVENT_NAME, handleStorage as EventListener);
  };
}

export function notifyStoredValueChanged(key: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(STORAGE_EVENT_NAME, {
      detail: { key },
    })
  );
}

function getJsonSnapshot<T>(key: string, fallback: T): T {
  const raw = window.localStorage.getItem(key);
  const cached = jsonSnapshotCache.get(key);

  if (cached && cached.raw === raw) {
    return cached.value as T;
  }

  let value = fallback;

  if (raw) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      value = fallback;
    }
  }

  jsonSnapshotCache.set(key, { raw, value });
  return value;
}

function getBooleanSnapshot(key: string, fallback: boolean): boolean {
  const raw = window.localStorage.getItem(key);
  const cached = booleanSnapshotCache.get(key);

  if (cached && cached.raw === raw) {
    return cached.value;
  }

  let value = fallback;

  if (raw) {
    try {
      value = JSON.parse(raw) as boolean;
    } catch {
      value = fallback;
    }
  }

  booleanSnapshotCache.set(key, { raw, value });
  return value;
}

export function useStoredJson<T>(key: string, fallback: T): T {
  const fallbackRef = useRef(fallback);

  return useSyncExternalStore(
    (onStoreChange) => subscribeToKey(key, onStoreChange),
    () => getJsonSnapshot(key, fallbackRef.current),
    () => fallbackRef.current
  );
}

export function useStoredBoolean(key: string, fallback = false): boolean {
  const fallbackRef = useRef(fallback);

  return useSyncExternalStore(
    (onStoreChange) => subscribeToKey(key, onStoreChange),
    () => getBooleanSnapshot(key, fallbackRef.current),
    () => fallbackRef.current
  );
}