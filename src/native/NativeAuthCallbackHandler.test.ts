import { describe, expect, it } from 'vitest';
import { nativeCallbackPath } from '../../native/NativeAuthCallbackHandler';

describe('nativeCallbackPath', () => {
  it('maps the registered callback deep link to the local callback route', () => {
    expect(
      nativeCallbackPath('realfakebirds://auth/callback?token_hash=abc&type=recovery&next=%2Fsettings'),
    ).toBe('/auth/callback?token_hash=abc&type=recovery&next=%2Fsettings');
  });

  it('ignores URLs outside the registered app scheme', () => {
    expect(nativeCallbackPath('https://www.realfakebirds.app/auth/callback?code=abc')).toBeNull();
  });
});
