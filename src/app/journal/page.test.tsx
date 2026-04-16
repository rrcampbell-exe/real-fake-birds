import { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import JournalPage from './page';
import { PENDING_JOURNAL_TARGET_KEY } from '@/lib/utils/bird-journal';

const {
  applyJournalClassificationViewToSessionMissionsMock,
  buildMissionRewardGrantEventsMock,
  flushQueuedProgressEventsForSignedInUserMock,
  linkedTargetEffectMock,
  queueProgressEventMock,
  trackClientErrorMock,
  trackMock,
  useAccountStateMock,
} = vi.hoisted(() => ({
  applyJournalClassificationViewToSessionMissionsMock: vi.fn(() => ({
    nextState: null,
    newlyCompletedMissionIds: [],
    missionRewards: [],
    missionSetBonusSeedsEarned: 0,
    totalRewardSeeds: 0,
    completedDailyMissionSet: false,
    dailyMissionStreak: null,
  })),
  buildMissionRewardGrantEventsMock: vi.fn(() => []),
  flushQueuedProgressEventsForSignedInUserMock: vi.fn().mockResolvedValue(undefined),
  linkedTargetEffectMock: vi.fn(),
  queueProgressEventMock: vi.fn(),
  trackClientErrorMock: vi.fn(),
  trackMock: vi.fn(),
  useAccountStateMock: vi.fn(() => ({
    isSignedIn: false,
  })),
}));

const mockedBirdCard = vi.fn(({ entry, isLinkedTarget }: { entry: { birdName: string }; isLinkedTarget?: boolean }) => (
  <div>{`${entry.birdName}:${String(Boolean(isLinkedTarget))}`}</div>
));

function MockBirdCard(props: { entry: { birdKey: string; birdName: string }; isLinkedTarget?: boolean; onOpenDetails?: (birdKey: string) => void }) {
  useEffect(() => {
    if (props.isLinkedTarget) {
      linkedTargetEffectMock(props);
    }
  }, [props]);

  return mockedBirdCard(props);
}

vi.mock('@/components/account/AccountStateProvider', () => ({
  useAccountState: useAccountStateMock,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => window.location.pathname,
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

vi.mock('@/hooks/usePageProgressSync', () => ({
  usePageProgressSync: vi.fn(),
}));

vi.mock('@/hooks/useBirdJournal', () => ({
  useBirdJournal: vi.fn(),
}));

vi.mock('@/hooks/useBirdhouse', () => ({
  useBirdhouse: vi.fn(),
}));

vi.mock('@/hooks/useStoredValue', () => ({
  useStoredJson: vi.fn(),
  notifyStoredValueChanged: vi.fn(),
}));

vi.mock('@/lib/auth/account-session', () => ({
  flushQueuedProgressEventsForSignedInUser: flushQueuedProgressEventsForSignedInUserMock,
}));

vi.mock('@/lib/analytics', () => ({
  track: trackMock,
  trackClientError: trackClientErrorMock,
}));

vi.mock('@/lib/progress/progress-event-outbox', () => ({
  queueProgressEvent: queueProgressEventMock,
}));

vi.mock('@/lib/utils/daily-mission-date', () => ({
  getTodayMissionDate: vi.fn(() => '2026-04-07'),
}));

vi.mock('@/lib/utils/missions', () => ({
  applyJournalClassificationViewToSessionMissions: applyJournalClassificationViewToSessionMissionsMock,
  buildMissionRewardGrantEvents: buildMissionRewardGrantEventsMock,
}));

vi.mock('@/components/journal/BirdCard', () => ({
  default: MockBirdCard,
}));

vi.mock('@/components/journal/JournalControls', () => ({
  default: () => <div>JournalControls</div>,
}));

vi.mock('@/components/birdhouse/BirdhouseSwapSheet', () => ({
  default: () => null,
}));

import { useBirdJournal } from '@/hooks/useBirdJournal';
import { useBirdhouse } from '@/hooks/useBirdhouse';
import { usePageProgressSync } from '@/hooks/usePageProgressSync';
import { useStoredJson } from '@/hooks/useStoredValue';

const mockedUseBirdJournal = vi.mocked(useBirdJournal);
const mockedUseBirdhouse = vi.mocked(useBirdhouse);
const mockedUsePageProgressSync = vi.mocked(usePageProgressSync);
const mockedUseStoredJson = vi.mocked(useStoredJson);

describe('JournalPage', () => {
  beforeEach(() => {
    localStorage.clear();
    mockedBirdCard.mockReset();
    mockedBirdCard.mockImplementation(({ entry, isLinkedTarget }: { entry: { birdName: string }; isLinkedTarget?: boolean }) => (
      <div>{`${entry.birdName}:${String(Boolean(isLinkedTarget))}`}</div>
    ));
    applyJournalClassificationViewToSessionMissionsMock.mockClear();
    buildMissionRewardGrantEventsMock.mockClear();
    flushQueuedProgressEventsForSignedInUserMock.mockReset();
    flushQueuedProgressEventsForSignedInUserMock.mockResolvedValue(undefined);
    linkedTargetEffectMock.mockReset();
    queueProgressEventMock.mockClear();
    trackClientErrorMock.mockClear();
    trackMock.mockClear();
    useAccountStateMock.mockReset();
    useAccountStateMock.mockReturnValue({
      isSignedIn: false,
    });
    window.history.replaceState({}, '', '/journal');
  });

  it('marks the query-param bird as the linked journal target on mount', async () => {
    window.history.replaceState({}, '', '/journal?bird=real%3Aowl');
    mockedBirdCard.mockClear();
    mockedUsePageProgressSync.mockReturnValue({
      isPageSyncLoading: false,
      isPageBackgroundRefreshing: false,
      isSignedIn: true,
    });
    mockedUseBirdhouse.mockReturnValue({
      birdhouse: { real: [], fake: [], updatedAt: new Date(0).toISOString() },
      realCount: 0,
      fakeCount: 0,
      realCap: 10,
      fakeCap: 10,
      isInBirdhouse: vi.fn().mockReturnValue(false),
      add: vi.fn(),
      remove: vi.fn(),
      swap: vi.fn(),
    });
    mockedUseBirdJournal.mockReturnValue({
      journal: [
        {
          birdKey: 'real:owl',
          birdName: 'Owl',
          isReal: true,
          seenCount: 3,
          correctCount: 2,
          incorrectCount: 1,
          lastSeenAt: '2026-04-07T12:00:00.000Z',
          metadata: {},
        },
      ],
      journalByKey: {},
      uniqueBirdCount: 1,
      realBirdCount: 1,
      fakeBirdCount: 0,
      totalSeen: 3,
      totalCorrect: 2,
      accuracy: 67,
      getEntry: vi.fn(),
    });
    mockedUseStoredJson.mockReturnValue(null);

    render(<JournalPage />);

    await waitFor(() => {
      expect(screen.getByText('Owl:true')).toBeInTheDocument();
    });

    expect(window.location.pathname).toBe('/journal');
    expect(window.location.search).toBe('');
  });

  it('marks the pending bird target as linked on mount', async () => {
    localStorage.setItem(PENDING_JOURNAL_TARGET_KEY, JSON.stringify('real:owl'));
    mockedBirdCard.mockClear();
    mockedUsePageProgressSync.mockReturnValue({
      isPageSyncLoading: false,
      isPageBackgroundRefreshing: false,
      isSignedIn: true,
    });
    mockedUseBirdhouse.mockReturnValue({
      birdhouse: { real: [], fake: [], updatedAt: new Date(0).toISOString() },
      realCount: 0,
      fakeCount: 0,
      realCap: 10,
      fakeCap: 10,
      isInBirdhouse: vi.fn().mockReturnValue(false),
      add: vi.fn(),
      remove: vi.fn(),
      swap: vi.fn(),
    });
    mockedUseBirdJournal.mockReturnValue({
      journal: [
        {
          birdKey: 'real:owl',
          birdName: 'Owl',
          isReal: true,
          seenCount: 3,
          correctCount: 2,
          incorrectCount: 1,
          lastSeenAt: '2026-04-07T12:00:00.000Z',
          metadata: {},
        },
      ],
      journalByKey: {},
      uniqueBirdCount: 1,
      realBirdCount: 1,
      fakeBirdCount: 0,
      totalSeen: 3,
      totalCorrect: 2,
      accuracy: 67,
      getEntry: vi.fn(),
    });
    mockedUseStoredJson.mockReturnValue(null);

    render(<JournalPage />);

    await waitFor(() => {
      expect(screen.getByText('Owl:true')).toBeInTheDocument();
    });

    expect(localStorage.getItem(PENDING_JOURNAL_TARGET_KEY)).toBeNull();
  });

  it('marks the hashed bird as the linked journal target on mount', async () => {
    window.history.replaceState({}, '', '/journal#real%3Aowl');
    mockedBirdCard.mockClear();
    mockedUsePageProgressSync.mockReturnValue({
      isPageSyncLoading: false,
      isPageBackgroundRefreshing: false,
      isSignedIn: true,
    });
    mockedUseBirdhouse.mockReturnValue({
      birdhouse: { real: [], fake: [], updatedAt: new Date(0).toISOString() },
      realCount: 0,
      fakeCount: 0,
      realCap: 10,
      fakeCap: 10,
      isInBirdhouse: vi.fn().mockReturnValue(false),
      add: vi.fn(),
      remove: vi.fn(),
      swap: vi.fn(),
    });
    mockedUseBirdJournal.mockReturnValue({
      journal: [
        {
          birdKey: 'real:owl',
          birdName: 'Owl',
          isReal: true,
          seenCount: 3,
          correctCount: 2,
          incorrectCount: 1,
          lastSeenAt: '2026-04-07T12:00:00.000Z',
          metadata: {},
        },
      ],
      journalByKey: {},
      uniqueBirdCount: 1,
      realBirdCount: 1,
      fakeBirdCount: 0,
      totalSeen: 3,
      totalCorrect: 2,
      accuracy: 67,
      getEntry: vi.fn(),
    });
    mockedUseStoredJson.mockReturnValue(null);

    render(<JournalPage />);

    await waitFor(() => {
      expect(screen.getByText('Owl:true')).toBeInTheDocument();
    });

    window.history.replaceState({}, '', '/journal');
  });

  it('shows a refresh badge while signed-in progress syncs in the background', () => {
    mockedUsePageProgressSync.mockReturnValue({
      isPageSyncLoading: false,
      isPageBackgroundRefreshing: true,
      isSignedIn: true,
    });
    mockedUseBirdhouse.mockReturnValue({
      birdhouse: { real: [], fake: [], updatedAt: new Date(0).toISOString() },
      realCount: 0,
      fakeCount: 0,
      realCap: 10,
      fakeCap: 10,
      isInBirdhouse: vi.fn().mockReturnValue(false),
      add: vi.fn(),
      remove: vi.fn(),
      swap: vi.fn(),
    });
    mockedUseBirdJournal.mockReturnValue({
      journal: [],
      journalByKey: {},
      uniqueBirdCount: 0,
      realBirdCount: 0,
      fakeBirdCount: 0,
      totalSeen: 0,
      totalCorrect: 0,
      accuracy: 0,
      getEntry: vi.fn(),
    });
    mockedUseStoredJson.mockReturnValue(null);

    render(<JournalPage />);

    expect(screen.getByText('Updating your field notes...')).toBeInTheDocument();
  });

  it('renders journal cards once sync completes', () => {
    mockedUsePageProgressSync.mockReturnValue({
      isPageSyncLoading: false,
      isPageBackgroundRefreshing: false,
      isSignedIn: true,
    });
    mockedUseBirdhouse.mockReturnValue({
      birdhouse: { real: [], fake: [], updatedAt: new Date(0).toISOString() },
      realCount: 0,
      fakeCount: 0,
      realCap: 10,
      fakeCap: 10,
      isInBirdhouse: vi.fn().mockReturnValue(false),
      add: vi.fn(),
      remove: vi.fn(),
      swap: vi.fn(),
    });
    mockedUseBirdJournal.mockReturnValue({
      journal: [
        {
          birdKey: 'real:owl',
          birdName: 'Owl',
          isReal: true,
          seenCount: 3,
          correctCount: 2,
          incorrectCount: 1,
          lastSeenAt: '2026-04-07T12:00:00.000Z',
          metadata: {},
        },
      ],
      journalByKey: {},
      uniqueBirdCount: 1,
      realBirdCount: 1,
      fakeBirdCount: 0,
      totalSeen: 3,
      totalCorrect: 2,
      accuracy: 67,
      getEntry: vi.fn(),
    });
    mockedUseStoredJson.mockReturnValue(null);

    render(<JournalPage />);

    expect(screen.getByText('Field Journal')).toBeInTheDocument();
    expect(screen.getByText('JournalControls')).toBeInTheDocument();
    expect(screen.getByText('Owl:false')).toBeInTheDocument();
  });

  it('keeps the journal page stable when linked-target sync fails in the background', async () => {
    window.history.replaceState({}, '', '/journal?bird=real%3Aowl');
    linkedTargetEffectMock.mockImplementation(({ entry, onOpenDetails }: { entry: { birdKey: string }; onOpenDetails?: (birdKey: string) => void }) => {
      onOpenDetails?.(entry.birdKey);
    });
    flushQueuedProgressEventsForSignedInUserMock.mockRejectedValueOnce(new Error('sync failed'));
    useAccountStateMock.mockReturnValue({
      isSignedIn: true,
    });
    mockedUsePageProgressSync.mockReturnValue({
      isPageSyncLoading: false,
      isPageBackgroundRefreshing: false,
      isSignedIn: true,
    });
    mockedUseBirdhouse.mockReturnValue({
      birdhouse: { real: [], fake: [], updatedAt: new Date(0).toISOString() },
      realCount: 0,
      fakeCount: 0,
      realCap: 10,
      fakeCap: 10,
      isInBirdhouse: vi.fn().mockReturnValue(false),
      add: vi.fn(),
      remove: vi.fn(),
      swap: vi.fn(),
    });
    mockedUseBirdJournal.mockReturnValue({
      journal: [
        {
          birdKey: 'real:owl',
          birdName: 'Owl',
          isReal: true,
          seenCount: 3,
          correctCount: 2,
          incorrectCount: 1,
          lastSeenAt: '2026-04-07T12:00:00.000Z',
          metadata: {
            sciName: 'Strix varia',
          },
        },
      ],
      journalByKey: {},
      uniqueBirdCount: 1,
      realBirdCount: 1,
      fakeBirdCount: 0,
      totalSeen: 3,
      totalCorrect: 2,
      accuracy: 67,
      getEntry: vi.fn(),
    });
    mockedUseStoredJson.mockReturnValue(null);

    render(<JournalPage />);

    await waitFor(() => {
      expect(screen.getByText('Field Journal')).toBeInTheDocument();
      expect(screen.getByText('Owl:true')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(flushQueuedProgressEventsForSignedInUserMock).toHaveBeenCalledTimes(1);
    });

    expect(trackClientErrorMock).toHaveBeenCalledWith('journal_progress_flush_failed', expect.any(Error), {
      bird_key: 'real:owl',
      interaction_source: 'linked-target',
      screen: 'journal',
    });
  });
});