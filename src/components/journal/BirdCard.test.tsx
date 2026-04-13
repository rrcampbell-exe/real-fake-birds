import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BirdCard from './BirdCard';

vi.mock('@/components/birdhouse/BirdhouseToggleButton', () => ({
  default: ({ birdName }: { birdName: string }) => <button type="button">Birdhouse {birdName}</button>,
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

  it('masks stats for concealed birds and offers a reveal button', () => {
    const onRevealClassification = vi.fn();

    render(
      <BirdCard
        entry={concealedEntry}
        isMaskedForCurrentRound
        canAffordReveal
        onRevealForCurrentRound={onRevealClassification}
      />
    );

    expect(screen.getByRole('button', { name: /reveal for 32/i })).toBeInTheDocument();
    expect(screen.getByText('Seen ??? times')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /reveal for 32 seeds/i }));
    expect(onRevealClassification).toHaveBeenCalledWith('real:blue-jay');
  });

  it('shows full stats for revealed birds', () => {
    const onOpenDetails = vi.fn();

    render(
      <BirdCard
        entry={{
          ...concealedEntry,
        }}
        isMaskedForCurrentRound={false}
        canAffordReveal
        onRevealForCurrentRound={vi.fn()}
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

  it('auto-expands the linked journal target', () => {
    render(
      <BirdCard
        entry={concealedEntry}
        isMaskedForCurrentRound={false}
        canAffordReveal
        onRevealForCurrentRound={vi.fn()}
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
        isMaskedForCurrentRound={false}
        canAffordReveal
        onRevealForCurrentRound={vi.fn()}
      />
    );

    expect(screen.queryByText('North America')).not.toBeInTheDocument();

    rerender(
      <BirdCard
        entry={concealedEntry}
        isMaskedForCurrentRound={false}
        canAffordReveal
        onRevealForCurrentRound={vi.fn()}
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
        isMaskedForCurrentRound={false}
        canAffordReveal
        onRevealForCurrentRound={vi.fn()}
        isLinkedTarget
      />
    );

    expect(screen.getByTestId('journal-image-shimmer')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Blue Jay' })).toBeInTheDocument();
  });

  it('shows an image-unavailable fallback when the journal image fails', () => {
    render(
      <BirdCard
        entry={concealedEntry}
        isMaskedForCurrentRound={false}
        canAffordReveal
        onRevealForCurrentRound={vi.fn()}
        isLinkedTarget
      />
    );

    fireEvent.error(screen.getByRole('img', { name: 'Blue Jay' }));

    expect(screen.getByText('Image unavailable')).toBeInTheDocument();
    expect(screen.queryByTestId('journal-image-shimmer')).not.toBeInTheDocument();
  });
});
