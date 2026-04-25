import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
    getPlatform: vi.fn(),
  },
}));

import { Capacitor } from '@capacitor/core';
import { isAndroidPlatform, isIosPlatform, isNativePlatform } from './platform';

const mockCapacitor = vi.mocked(Capacitor);

describe('isNativePlatform', () => {
  beforeEach(() => {
    delete (window as Window & { Capacitor?: unknown }).Capacitor;
  });

  it('returns true when Capacitor reports native', () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true);
    expect(isNativePlatform()).toBe(true);
  });

  it('returns true via window.Capacitor fallback when Capacitor import returns false', () => {
    mockCapacitor.isNativePlatform.mockReturnValue(false);
    (window as Window & { Capacitor?: unknown }).Capacitor = { isNativePlatform: () => true };
    expect(isNativePlatform()).toBe(true);
  });

  it('returns false on web when neither Capacitor source reports native', () => {
    mockCapacitor.isNativePlatform.mockReturnValue(false);
    expect(isNativePlatform()).toBe(false);
  });
});

describe('isIosPlatform', () => {
  beforeEach(() => {
    delete (window as Window & { Capacitor?: unknown }).Capacitor;
  });

  it('returns true when Capacitor reports ios platform', () => {
    mockCapacitor.getPlatform.mockReturnValue('ios');
    expect(isIosPlatform()).toBe(true);
  });

  it('returns true via window.Capacitor fallback when Capacitor import returns non-ios', () => {
    mockCapacitor.getPlatform.mockReturnValue('web');
    (window as Window & { Capacitor?: unknown }).Capacitor = { getPlatform: () => 'ios' };
    expect(isIosPlatform()).toBe(true);
  });

  it('returns false on web', () => {
    mockCapacitor.getPlatform.mockReturnValue('web');
    expect(isIosPlatform()).toBe(false);
  });
});

describe('isAndroidPlatform', () => {
  beforeEach(() => {
    delete (window as Window & { Capacitor?: unknown }).Capacitor;
  });

  it('returns true when Capacitor reports android platform', () => {
    mockCapacitor.getPlatform.mockReturnValue('android');
    expect(isAndroidPlatform()).toBe(true);
  });

  it('returns true via window.Capacitor fallback when Capacitor import returns non-android', () => {
    mockCapacitor.getPlatform.mockReturnValue('web');
    (window as Window & { Capacitor?: unknown }).Capacitor = { getPlatform: () => 'android' };
    expect(isAndroidPlatform()).toBe(true);
  });

  it('returns false on web', () => {
    mockCapacitor.getPlatform.mockReturnValue('web');
    expect(isAndroidPlatform()).toBe(false);
  });
});
