import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BirdCard from './BirdCard';

describe('BirdCard', () => {
  it('renders loading content in loading state', () => {
    render(
      <BirdCard
        birdName="Blue Robin"
        state="loading"
        onAnswer={vi.fn()}
        loadingContent={<div>Loading Bird</div>}
      />
    );

    expect(screen.getByText('Loading Bird')).toBeInTheDocument();
  });

  it('renders question state and passes button clicks through', () => {
    const onAnswer = vi.fn();
    render(<BirdCard birdName="Blue Robin" state="question" onAnswer={onAnswer} />);

    expect(screen.getByText('Blue Robin')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Real Bird' }));
    expect(onAnswer).toHaveBeenCalled();
  });

  it('renders answer content in answer state', () => {
    render(
      <BirdCard
        birdName="Blue Robin"
        state="answer"
        onAnswer={vi.fn()}
        answerContent={<div>Answer Screen</div>}
      />
    );

    expect(screen.getByText('Answer Screen')).toBeInTheDocument();
  });
});