import type { ProgressEvent } from './progress-events';

export const PROGRESS_EVENT_OUTBOX_STORAGE_KEY = 'progressEventOutbox';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function readProgressEventOutbox(): ProgressEvent[] {
  if (!isBrowser()) {
    return [];
  }

  const raw = window.localStorage.getItem(PROGRESS_EVENT_OUTBOX_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ProgressEvent[]) : [];
  } catch {
    return [];
  }
}

function writeProgressEventOutbox(events: ProgressEvent[]): ProgressEvent[] {
  if (!isBrowser()) {
    return events;
  }

  window.localStorage.setItem(PROGRESS_EVENT_OUTBOX_STORAGE_KEY, JSON.stringify(events));
  return events;
}

export function queueProgressEvent(event: ProgressEvent): ProgressEvent[] {
  return writeProgressEventOutbox([...readProgressEventOutbox(), event]);
}

export function removeQueuedProgressEvents(eventIds: string[]): ProgressEvent[] {
  const ids = new Set(eventIds);
  return writeProgressEventOutbox(readProgressEventOutbox().filter((event) => !ids.has(event.eventId)));
}

export function clearProgressEventOutbox(): ProgressEvent[] {
  return writeProgressEventOutbox([]);
}

export function createProgressEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `progress-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
