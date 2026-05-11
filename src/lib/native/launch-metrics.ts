'use client';

const APP_LAUNCH_START_MARK = 'rfb:launch-start';
const seenLaunchStages = new Set<string>();

export function markLaunchStage(
  stage: string,
  detail?: Record<string, unknown>,
  options?: { once?: boolean }
): void {
  if (typeof window === 'undefined' || typeof performance === 'undefined') {
    return;
  }

  if (options?.once && seenLaunchStages.has(stage)) {
    return;
  }

  if (options?.once) {
    seenLaunchStages.add(stage);
  }

  const markName = `rfb:${stage}`;
  performance.mark(markName);

  const launchStart = performance.getEntriesByName(APP_LAUNCH_START_MARK).at(-1);
  const elapsedMs = launchStart ? Math.round(performance.now() - launchStart.startTime) : null;
  const payload = {
    elapsedMs,
    ...(detail ?? {}),
  };

  console.info(`[launch] ${stage}`, payload);
}
