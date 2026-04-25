import { Capacitor } from '@capacitor/core';

/**
 * Platform detection utilities for Capacitor native shell.
 * All functions guard against SSR by checking for `window` before
 * calling into the Capacitor runtime.
 */

function getCapacitor() {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).Capacitor ?? null;
}

/** Returns true when running inside the Capacitor native shell (iOS or Android). */
export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  return Capacitor.isNativePlatform() || Boolean(getCapacitor()?.isNativePlatform?.());
}

/** Returns true when running inside the Capacitor iOS shell. */
export function isIosPlatform(): boolean {
  if (typeof window === 'undefined') return false;
  const platform = Capacitor.getPlatform();
  return platform === 'ios' || getCapacitor()?.getPlatform?.() === 'ios';
}

/** Returns true when running inside the Capacitor Android shell. */
export function isAndroidPlatform(): boolean {
  if (typeof window === 'undefined') return false;
  const platform = Capacitor.getPlatform();
  return platform === 'android' || getCapacitor()?.getPlatform?.() === 'android';
}
