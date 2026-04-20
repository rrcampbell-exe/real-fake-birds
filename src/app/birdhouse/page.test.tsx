import type React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BirdhousePage from './page';

vi.mock('next/image', () => ({
  default: ({ alt, fill: _fill, unoptimized: _unoptimized, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    unoptimized?: boolean;
  }) => <img alt={alt ?? ''} {...props} />,
}));

vi.mock('@/hooks/useBirdhouse', () => ({
  useBirdhouse: vi.fn(),
}));

vi.mock('@/hooks/useBirdJournal', () => ({
  useBirdJournal: vi.fn(),
}));

vi.mock('@/hooks/usePageProgressSync', () => ({
  usePageProgressSync: vi.fn(),
}));

vi.mock('@/hooks/useScreenViewed', () => ({
  useScreenViewed: vi.fn(),
}));

vi.mock('@/lib/utils/birdhouse', () => ({
  writeBirdhouseLastVisitedAt: vi.fn(),
}));

vi.mock('@/components/birdhouse/BirdhouseToggleButton', () => ({
  default: ({ birdName }: { birdName: string }) => <button type="button">Birdhouse {birdName}</button>,
}));

import { useBirdhouse } from '@/hooks/useBirdhouse';
import { useBirdJournal } from '@/hooks/useBirdJournal';
import { usePageProgressSync } from '@/hooks/usePageProgressSync';

const mockedUseBirdhouse = vi.mocked(useBirdhouse);
const mockedUseBirdJournal = vi.mocked(useBirdJournal);
const mockedUsePageProgressSync = vi.mocked(usePageProgressSync);

describe('BirdhousePage', () => {
  beforeEach(() => {
    mockedUsePageProgressSync.mockReturnValue({
      isPageBackgroundRefreshing: false,
      isPageSyncLoading: false,
      isSignedIn: false,
    });
  });

  it('shows a revealed fake bird image on the Fake Birds tab', () => {
    mockedUseBirdhouse.mockReturnValue({
      birdhouse: { real: [], fake: ['fake:blue-robin'], updatedAt: new Date(0).toISOString() },
      realCount: 0,
      fakeCount: 1,
      realCap: 10,
      fakeCap: 10,
      isInBirdhouse: vi.fn().mockReturnValue(true),
      add: vi.fn(),
      remove: vi.fn(),
      swap: vi.fn(),
    });
    mockedUseBirdJournal.mockReturnValue({
      journal: [],
      journalByKey: {
        'fake:blue-robin': {
          birdKey: 'fake:blue-robin',
          birdName: 'Blue Robin',
          isReal: false,
          seenCount: 1,
          correctCount: 1,
          incorrectCount: 0,
          lastSeenAt: '2026-04-20T00:00:00.000Z',
          metadata: {
            imageUrl: 'https://example.com/blue-robin.jpg',
            imageRevealed: true,
          },
        },
      },
      getEntry: vi.fn(),
      uniqueBirdCount: 1,
      realBirdCount: 0,
      fakeBirdCount: 1,
      totalSeen: 1,
      totalCorrect: 1,
      accuracy: 100,
    });

    render(<BirdhousePage />);

    fireEvent.click(screen.getByRole('button', { name: /fake birds/i }));

    expect(screen.getByRole('img', { name: 'Blue Robin' })).toBeInTheDocument();
  });

  it('keeps unrevealed fake birds on the placeholder treatment', () => {
    mockedUseBirdhouse.mockReturnValue({
      birdhouse: { real: [], fake: ['fake:blue-robin'], updatedAt: new Date(0).toISOString() },
      realCount: 0,
      fakeCount: 1,
      realCap: 10,
      fakeCap: 10,
      isInBirdhouse: vi.fn().mockReturnValue(true),
      add: vi.fn(),
      remove: vi.fn(),
      swap: vi.fn(),
    });
    mockedUseBirdJournal.mockReturnValue({
      journal: [],
      journalByKey: {
        'fake:blue-robin': {
          birdKey: 'fake:blue-robin',
          birdName: 'Blue Robin',
          isReal: false,
          seenCount: 1,
          correctCount: 1,
          incorrectCount: 0,
          lastSeenAt: '2026-04-20T00:00:00.000Z',
          metadata: {
            imageUrl: 'https://example.com/blue-robin.jpg',
            imageRevealed: false,
          },
        },
      },
      getEntry: vi.fn(),
      uniqueBirdCount: 1,
      realBirdCount: 0,
      fakeBirdCount: 1,
      totalSeen: 1,
      totalCorrect: 1,
      accuracy: 100,
    });

    render(<BirdhousePage />);

    fireEvent.click(screen.getByRole('button', { name: /fake birds/i }));

    expect(screen.queryByRole('img', { name: 'Blue Robin' })).not.toBeInTheDocument();
    expect(screen.getByText('Fictional Favorite')).toBeInTheDocument();
  });
});