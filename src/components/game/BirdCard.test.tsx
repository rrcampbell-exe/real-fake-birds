import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BirdCard from './BirdCard';

vi.mock('@/hooks/useSound', () => ({
  useSound: () => ({ play: vi.fn() }),
}));

describe('BirdCard', () => {
  it('renders loading content in loading state', () => {
    render(
      <BirdCard
        birdName="Blue Robin"
        hintError={null}
        hintErrorType={null}
        hintLoading={{ fact: false, image: false }}
        hints={{ fact: null, image: null }}
        onRequestHint={vi.fn()}
        state="loading"
        seedsBalance={0}
        onAnswer={vi.fn()}
        loadingContent={<div>Loading Bird</div>}
      />
    );

    expect(screen.getByText('Loading Bird')).toBeInTheDocument();
  });

  it('renders question state and passes button clicks through', () => {
    const onAnswer = vi.fn();
    render(
      <BirdCard
        birdName="Blue Robin"
        hintError={null}
        hintErrorType={null}
        hintLoading={{ fact: false, image: false }}
        hints={{ fact: null, image: null }}
        onRequestHint={vi.fn()}
        state="question"
        seedsBalance={100}
        onAnswer={onAnswer}
      />
    );

    expect(screen.getByText('Blue Robin')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Real Bird' }));
    expect(onAnswer).toHaveBeenCalled();
  });

  it('renders answer content in answer state', () => {
    render(
      <BirdCard
        birdName="Blue Robin"
        hintError={null}
        hintErrorType={null}
        hintLoading={{ fact: false, image: false }}
        hints={{ fact: null, image: null }}
        onRequestHint={vi.fn()}
        state="answer"
        seedsBalance={0}
        onAnswer={vi.fn()}
        answerContent={<div>Answer Screen</div>}
      />
    );

    expect(screen.getByText('Answer Screen')).toBeInTheDocument();
  });
});