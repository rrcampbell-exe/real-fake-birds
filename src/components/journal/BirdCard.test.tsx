import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BirdCard from './BirdCard';

vi.mock('@/components/birdhouse/BirdhouseToggleButton', () => ({
  default: ({ birdName, isLocked, onLockedClick }: { birdName: string; isLocked?: boolean; onLockedClick?: () => void }) => (
    <button type="button" onClick={isLocked ? onLockedClick : undefined}>Birdhouse {birdName}</button>
  ),
}));

describe('Journal BirdCard', () => {
  const concealedEntry = {
    birdKey: 'real:blue-jay',
    birdName: 'Blue Jay',
    isReal: true,
    seenCount: 3,
    correctCount: 2,
    incorrectCount: 1,
    lastSeenAt: '2026-04-05T12:00:00.000Z',
    metadata: {
      classificationRevealed: false,
      regionLabel: 'North America',
      sciName: 'Cyanocitta cristata',
      fact: 'A bright and noisy corvid.',
      summary: 'A bright and noisy corvid found across much of North America.',
      articleUrl: 'https://en.wikipedia.org/wiki/Blue_Jay',
      imageUrl: 'https://upload.wikimedia.org/example.jpg',
      description: 'bird species',
    },
  };

  const entryWithBothImageSizes = {
    ...concealedEntry,
    metadata: {
      ...concealedEntry.metadata,
      imageUrl: 'https://images.example.com/blue-jay-full.jpg',
      imageThumbUrl: 'https://images.example.com/blue-jay-thumb.jpg',
    },
  };

  const concealedFakeEntry = {
    ...concealedEntry,
    birdKey: 'fake:blue-jay',
    isReal: false,
    metadata: {
      ...concealedEntry.metadata,
      imageRevealed: false,
    },
  };

  it('shows full stats for revealed birds', () => {
    const onOpenDetails = vi.fn();

    render(
      <BirdCard
        entry={{
          ...concealedEntry,
        }}
        canAffordFakeImageReveal
        onRevealFakeImage={vi.fn()}
        onOpenDetails={onOpenDetails}
      />
    );

    expect(screen.getByText('Real')).toBeInTheDocument();
    expect(screen.getByText('Seen 3 times • Last seen April 5, 2026')).toBeInTheDocument();
    expect(screen.getByText('66%')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Birdhouse Blue Jay' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /details/i }));
    const image = screen.getByRole('img', { name: 'Blue Jay' });
    const expandedName = screen.getByText('Blue Jay');
    const seenSummaryText = screen.getByText('Seen 3 times • Last seen April 5, 2026');
    const factsText = screen.getByText('A bright and noisy corvid found across much of North America.');
    expect(image).toBeInTheDocument();
    expect(image.compareDocumentPosition(expandedName) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(seenSummaryText).toBeInTheDocument();
    expect(screen.getByText('North America')).toBeInTheDocument();
    expect(screen.getByText('Cyanocitta cristata')).toBeInTheDocument();
    expect(factsText).toBeInTheDocument();
    expect(factsText.compareDocumentPosition(screen.getByText('Accuracy')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText('bird species')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Read more on Wikipedia' })).not.toBeInTheDocument();
    expect(onOpenDetails).toHaveBeenCalledWith('real:blue-jay');
  });

  it('prefers the full-size image over the thumbnail in the expanded journal view', () => {
    render(
      <BirdCard
        entry={entryWithBothImageSizes}
        canAffordFakeImageReveal
        onRevealFakeImage={vi.fn()}
        isLinkedTarget
      />
    );

    expect(screen.getByRole('img', { name: 'Blue Jay' })).toHaveAttribute(
      'src',
      'https://images.example.com/blue-jay-full.jpg'
    );
  });

  it('auto-expands the linked journal target', () => {
    render(
      <BirdCard
        entry={concealedEntry}
        canAffordFakeImageReveal
        onRevealFakeImage={vi.fn()}
        isLinkedTarget
      />
    );

    expect(screen.getByText('North America')).toBeInTheDocument();
    expect(screen.getByText('A bright and noisy corvid found across much of North America.')).toBeInTheDocument();
  });

  it('auto-expands when a card becomes the linked journal target later', async () => {
    const { rerender } = render(
      <BirdCard
        entry={concealedEntry}
        canAffordFakeImageReveal
        onRevealFakeImage={vi.fn()}
      />
    );

    expect(screen.queryByText('North America')).not.toBeInTheDocument();

    rerender(
      <BirdCard
        entry={concealedEntry}
        canAffordFakeImageReveal
        onRevealFakeImage={vi.fn()}
        isLinkedTarget
      />
    );

    await waitFor(() => {
      expect(screen.getByText('North America')).toBeInTheDocument();
    });
  });

  it('shows a shimmer over the journal image until it loads', () => {
    render(
      <BirdCard
        entry={concealedEntry}
        canAffordFakeImageReveal
        onRevealFakeImage={vi.fn()}
        isLinkedTarget
      />
    );

    expect(screen.getByTestId('journal-image-shimmer')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Blue Jay' })).toBeInTheDocument();
  });

  it('hides the journal image when it cannot be loaded', () => {
    render(
      <BirdCard
        entry={concealedEntry}
        canAffordFakeImageReveal
        onRevealFakeImage={vi.fn()}
        isLinkedTarget
      />
    );

    fireEvent.error(screen.getByRole('img', { name: 'Blue Jay' }));

    expect(screen.queryByRole('img', { name: 'Blue Jay' })).not.toBeInTheDocument();
    expect(screen.queryByText('Image unavailable')).not.toBeInTheDocument();
    expect(screen.queryByText('Tap to retry')).not.toBeInTheDocument();
  });

  it('hides unrevealed fake bird images and offers a journal reveal action', () => {
    const onRevealFakeImage = vi.fn();

    render(
      <BirdCard
        entry={concealedFakeEntry}
        canAffordFakeImageReveal
        onRevealFakeImage={onRevealFakeImage}
        isLinkedTarget
      />
    );

    expect(screen.queryByRole('img', { name: 'Blue Jay' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reveal hidden fake bird image' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reveal hidden fake bird image' }));

    expect(onRevealFakeImage).toHaveBeenCalledWith('fake:blue-jay');
  });

  it('shows a reveal-required toast when birdhouse is pressed for an unrevealed fake bird', () => {
    render(
      <BirdCard
        entry={concealedFakeEntry}
        canAffordFakeImageReveal
        onRevealFakeImage={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Birdhouse Blue Jay' }));

    expect(screen.getByText('Reveal Required')).toBeInTheDocument();
    expect(screen.getByText('Reveal this fake bird for 15 seeds before adding it to your Birdhouse.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reveal hidden fake bird image' })).toBeInTheDocument();
  });
});
