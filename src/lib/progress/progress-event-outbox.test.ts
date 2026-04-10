import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearProgressEventOutbox,
  createProgressEventId,
  PROGRESS_EVENT_OUTBOX_STORAGE_KEY,
  queueProgressEvent,
  readProgressEventOutbox,
  removeQueuedProgressEvents,
} from './progress-event-outbox';
import type { ProgressEvent } from './progress-events';

describe('progress-event-outbox', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('readProgressEventOutbox', () => {
    it('returns empty array when nothing stored', () => {
      expect(readProgressEventOutbox()).toEqual([]);
    });

    it('returns empty array when stored value is not an array', () => {
      localStorage.setItem(PROGRESS_EVENT_OUTBOX_STORAGE_KEY, JSON.stringify({ notAnArray: true }));
      expect(readProgressEventOutbox()).toEqual([]);
    });

    it('returns empty array when stored value is invalid JSON', () => {
      localStorage.setItem(PROGRESS_EVENT_OUTBOX_STORAGE_KEY, '{bad-json');
      expect(readProgressEventOutbox()).toEqual([]);
    });

    it('returns parsed events when stored value is a valid array', () => {
      const events = [{ eventId: 'e1', eventType: 'round-resolved', occurredAt: '2026-01-01', payload: {} }];
      localStorage.setItem(PROGRESS_EVENT_OUTBOX_STORAGE_KEY, JSON.stringify(events));
      expect(readProgressEventOutbox()).toEqual(events);
    });
  });

  describe('queueProgressEvent', () => {
    it('appends an event to the outbox', () => {
      const event = { eventId: 'e1', eventType: 'round-resolved', occurredAt: '2026-01-01', payload: {} } as ProgressEvent;
      queueProgressEvent(event);
      expect(readProgressEventOutbox()).toEqual([event]);
    });

    it('appends multiple events', () => {
      const e1 = { eventId: 'e1', eventType: 'round-resolved', occurredAt: '2026-01-01', payload: {} } as ProgressEvent;
      const e2 = { eventId: 'e2', eventType: 'round-resolved', occurredAt: '2026-01-02', payload: {} } as ProgressEvent;
      queueProgressEvent(e1);
      queueProgressEvent(e2);
      expect(readProgressEventOutbox()).toEqual([e1, e2]);
    });
  });

  describe('removeQueuedProgressEvents', () => {
    it('removes events by their IDs', () => {
      const e1 = { eventId: 'e1', eventType: 'round-resolved', occurredAt: '2026-01-01', payload: {} } as ProgressEvent;
      const e2 = { eventId: 'e2', eventType: 'round-resolved', occurredAt: '2026-01-02', payload: {} } as ProgressEvent;
      queueProgressEvent(e1);
      queueProgressEvent(e2);
      removeQueuedProgressEvents(['e1']);
      expect(readProgressEventOutbox()).toEqual([e2]);
    });

    it('leaves outbox unchanged when IDs do not match', () => {
      const e1 = { eventId: 'e1', eventType: 'round-resolved', occurredAt: '2026-01-01', payload: {} } as ProgressEvent;
      queueProgressEvent(e1);
      removeQueuedProgressEvents(['nonexistent']);
      expect(readProgressEventOutbox()).toEqual([e1]);
    });
  });

  describe('clearProgressEventOutbox', () => {
    it('empties the outbox', () => {
      const e1 = { eventId: 'e1', eventType: 'round-resolved', occurredAt: '2026-01-01', payload: {} } as ProgressEvent;
      queueProgressEvent(e1);
      clearProgressEventOutbox();
      expect(readProgressEventOutbox()).toEqual([]);
    });
  });

  describe('createProgressEventId', () => {
    it('returns a UUID when crypto.randomUUID is available', () => {
      expect(createProgressEventId()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it('returns a fallback ID when crypto.randomUUID is not available', () => {
      const originalRandomUUID = crypto.randomUUID;
      Object.defineProperty(crypto, 'randomUUID', { value: undefined, writable: true, configurable: true });
      try {
        const id = createProgressEventId();
        expect(id).toMatch(/^progress-\d+-[0-9a-f]+$/);
      } finally {
        Object.defineProperty(crypto, 'randomUUID', { value: originalRandomUUID, writable: true, configurable: true });
      }
    });
  });
});
