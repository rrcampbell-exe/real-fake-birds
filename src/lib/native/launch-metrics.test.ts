import { beforeEach, describe, expect, it, vi } from 'vitest';

import { markLaunchStage } from './launch-metrics';

describe('launch-metrics', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    performance.clearMarks();
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  it('only deduplicates stages marked with once', () => {
    markLaunchStage('boot-overlay-mounted');
    markLaunchStage('boot-overlay-mounted', undefined, { once: true });

    const marks = performance.getEntriesByName('rfb:boot-overlay-mounted');
    expect(marks).toHaveLength(2);
  });

  it('suppresses repeated once-only stages', () => {
    markLaunchStage('native-splash-hidden', undefined, { once: true });
    markLaunchStage('native-splash-hidden', undefined, { once: true });

    const marks = performance.getEntriesByName('rfb:native-splash-hidden');
    expect(marks).toHaveLength(1);
  });
});
