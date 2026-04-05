import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BirdCard from './BirdCard';

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
    expect(screen.getByText('Last seen on ???')).toBeInTheDocument();
    expect(screen.getAllByText('???')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: /reveal for 32 seeds/i }));
    expect(onRevealClassification).toHaveBeenCalledWith('real:blue-jay');
  });

  it('shows full stats for revealed birds', () => {
    render(
      <BirdCard
        entry={{
          ...concealedEntry,
        }}
        isMaskedForCurrentRound={false}
        canAffordReveal
        onRevealForCurrentRound={vi.fn()}
      />
    );

    expect(screen.getByText('Real')).toBeInTheDocument();
    expect(screen.getByText('Seen 3 times')).toBeInTheDocument();
    expect(screen.getByText('66%')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
   });
 });
