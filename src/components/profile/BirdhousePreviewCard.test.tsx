import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BirdhousePreviewCard from './BirdhousePreviewCard';
import { useBirdhouse } from '@/hooks/useBirdhouse';
import { useBirdJournal } from '@/hooks/useBirdJournal';

vi.mock('@/hooks/useBirdhouse', () => ({
  useBirdhouse: vi.fn(),
}));

vi.mock('@/hooks/useBirdJournal', () => ({
  useBirdJournal: vi.fn(),
}));

describe('BirdhousePreviewCard', () => {
  it('renders empty state when no birds are in either house', () => {
    vi.mocked(useBirdhouse).mockReturnValue({
      birdhouse: {
        real: [],
        fake: [],
      },
      addBird: vi.fn(),
      removeBird: vi.fn(),
      isInBirdhouse: vi.fn(),
      totals: { real: 0, fake: 0 },
      hasAnyBirds: false,
    });
    vi.mocked(useBirdJournal).mockReturnValue({
      journal: [],
      journalByKey: {},
      addRoundResult: vi.fn(),
      uniqueBirdCount: 0,
      realBirdCount: 0,
      fakeBirdCount: 0,
      accuracy: 0,
      newestEntryAt: null,
      bestKnownStreak: 0,
    });

    render(<BirdhousePreviewCard />);

    expect(screen.getByText('Birdhouses')).toBeInTheDocument();
    expect(screen.getByText('View Birdhouses')).toBeInTheDocument();
    expect(screen.getByText('No birds placed yet. Start curating your roost.')).toBeInTheDocument();
    expect(screen.getAllByText('None yet')).toHaveLength(2);
  });

  it('renders latest real/fake birds and recent names from merged houses', () => {
    vi.mocked(useBirdhouse).mockReturnValue({
      birdhouse: {
        real: ['real-1'],
        fake: ['fake-1', 'fake-2'],
      },
      addBird: vi.fn(),
      removeBird: vi.fn(),
      isInBirdhouse: vi.fn(),
      totals: { real: 1, fake: 2 },
      hasAnyBirds: true,
    });
    vi.mocked(useBirdJournal).mockReturnValue({
      journal: [],
      journalByKey: {
        'real-1': {
          birdKey: 'real-1',
          birdName: 'Red Tail Hawk',
          isReal: true,
          seenCount: 4,
          correctCount: 3,
          incorrectCount: 1,
          lastSeenAt: '2026-05-03T12:00:00.000Z',
          metadata: {
            imageThumbUrl: 'https://example.com/real-thumb.jpg',
          },
        },
        'fake-1': {
          birdKey: 'fake-1',
          birdName: 'Cloud Crow',
          isReal: false,
          seenCount: 2,
          correctCount: 1,
          incorrectCount: 1,
          lastSeenAt: '2026-05-03T13:00:00.000Z',
          metadata: {},
        },
        'fake-2': {
          birdKey: 'fake-2',
          birdName: 'Copper Wren',
          isReal: false,
          seenCount: 1,
          correctCount: 1,
          incorrectCount: 0,
          lastSeenAt: '2026-05-03T14:00:00.000Z',
          metadata: {
            imageUrl: 'https://example.com/fake-full.jpg',
          },
        },
      },
      addRoundResult: vi.fn(),
      uniqueBirdCount: 3,
      realBirdCount: 1,
      fakeBirdCount: 2,
      accuracy: 80,
      newestEntryAt: '2026-05-03T14:00:00.000Z',
      bestKnownStreak: 2,
    });

    render(<BirdhousePreviewCard />);

    expect(screen.getAllByText('Red Tail Hawk')).toHaveLength(2);
    expect(screen.getAllByText('Copper Wren')).toHaveLength(2);
    expect(screen.getByAltText('Red Tail Hawk')).toBeInTheDocument();
    expect(screen.getByAltText('Copper Wren')).toBeInTheDocument();

    expect(screen.getByText('Recently Added')).toBeInTheDocument();
    expect(screen.getByText('Cloud Crow')).toBeInTheDocument();
  });
});
