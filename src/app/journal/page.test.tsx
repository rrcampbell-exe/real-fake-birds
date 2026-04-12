import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import JournalPage from './page';
import { PENDING_JOURNAL_TARGET_KEY } from '@/lib/utils/bird-journal';

const mockedBirdCard = vi.fn(({ entry, isLinkedTarget }: { entry: { birdName: string }; isLinkedTarget?: boolean }) => (
  <div>{`${entry.birdName}:${String(Boolean(isLinkedTarget))}`}</div>
));

vi.mock('@/components/account/AccountStateProvider', () => ({
  useAccountState: vi.fn(() => ({
    isSignedIn: false,
  })),
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

vi.mock('@/hooks/useStoredValue', () => ({
  useStoredJson: vi.fn(),
  notifyStoredValueChanged: vi.fn(),
}));

vi.mock('@/components/journal/BirdCard', () => ({
  default: (props: { entry: { birdName: string }; isLinkedTarget?: boolean }) => mockedBirdCard(props),
}));

vi.mock('@/components/journal/JournalControls', () => ({
  default: () => <div>JournalControls</div>,
}));

import { useBirdJournal } from '@/hooks/useBirdJournal';
import { usePageProgressSync } from '@/hooks/usePageProgressSync';
import { useStoredJson } from '@/hooks/useStoredValue';

const mockedUseBirdJournal = vi.mocked(useBirdJournal);
const mockedUsePageProgressSync = vi.mocked(usePageProgressSync);
const mockedUseStoredJson = vi.mocked(useStoredJson);

describe('JournalPage', () => {
  it('marks the query-param bird as the linked journal target on mount', async () => {
    window.history.replaceState({}, '', '/journal?bird=real%3Aowl');
    mockedBirdCard.mockClear();
    mockedUsePageProgressSync.mockReturnValue({
      isPageSyncLoading: false,
      isPageBackgroundRefreshing: false,
      isSignedIn: true,
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

  it('marks the pending bird target as linked on mount', async () => {
    localStorage.setItem(PENDING_JOURNAL_TARGET_KEY, JSON.stringify('real:owl'));
    mockedBirdCard.mockClear();
    mockedUsePageProgressSync.mockReturnValue({
      isPageSyncLoading: false,
      isPageBackgroundRefreshing: false,
      isSignedIn: true,
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
});