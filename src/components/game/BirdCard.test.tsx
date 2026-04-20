import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BirdCard from './BirdCard';

const { playMock } = vi.hoisted(() => ({
  playMock: vi.fn(),
}));

vi.mock('next/image', () => ({
  default: ({ alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt={alt ?? ''} {...props} />,
}));

vi.mock('@/hooks/useSound', () => ({
  useSound: () => ({ play: playMock }),
}));

describe('BirdCard', () => {
  beforeEach(() => {
    playMock.mockReset();
  });

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

  it('moves the image hint into the main card surface and keeps the fact preview below the answer buttons', () => {
    render(
      <BirdCard
        birdName="Blue Robin"
        hintError={null}
        hintErrorType={null}
        hintLoading={{ fact: false, image: false }}
        hints={{
          fact: { type: 'fact', content: 'Bright blue feathers.' },
          image: { type: 'image', content: 'https://example.com/blue-robin.jpg' },
        }}
        onRequestHint={vi.fn()}
        state="question"
        seedsBalance={100}
        onAnswer={vi.fn()}
      />
    );

    expect(screen.getByText('Blue Robin')).toBeInTheDocument();
    expect(screen.getByText('Bright blue feathers.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Hint image for Blue Robin' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Real Bird' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fake Bird' })).toBeInTheDocument();
  });

  it('shows a shimmer in the final image slot while an image hint is loading', () => {
    render(
      <BirdCard
        birdName="Blue Robin"
        hintError={null}
        hintErrorType={null}
        hintLoading={{ fact: false, image: true }}
        hints={{ fact: null, image: null }}
        onRequestHint={vi.fn()}
        state="question"
        seedsBalance={100}
        onAnswer={vi.fn()}
      />
    );

    expect(screen.getByTestId('question-image-shimmer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Real Bird' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fake Bird' })).toBeInTheDocument();
  });

  it('keeps text hints below the answer buttons when no image hint is active', () => {
    render(
      <BirdCard
        birdName="Blue Robin"
        hintError={null}
        hintErrorType={null}
        hintLoading={{ fact: false, image: false }}
        hints={{
          fact: { type: 'fact', content: 'Bright blue feathers.' },
          image: null,
        }}
        onRequestHint={vi.fn()}
        state="question"
        seedsBalance={100}
        onAnswer={vi.fn()}
      />
    );

    const realButton = screen.getByRole('button', { name: 'Real Bird' });
    const factText = screen.getByText('Bright blue feathers.');

    expect(realButton.compareDocumentPosition(factText) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('plays the field note loading motif and resolve chime when a fact hint arrives', () => {
    vi.useFakeTimers();

    const { rerender } = render(
      <BirdCard
        birdName="Blue Robin"
        hintError={null}
        hintErrorType={null}
        hintLoading={{ fact: true, image: false }}
        hints={{ fact: null, image: null }}
        onRequestHint={vi.fn()}
        state="question"
        seedsBalance={100}
        onAnswer={vi.fn()}
      />
    );

    expect(playMock).toHaveBeenCalledWith('hintFieldLoading');

    vi.advanceTimersByTime(520);

    expect(playMock.mock.calls.filter(([sound]) => sound === 'hintFieldLoading')).toHaveLength(2);

    rerender(
      <BirdCard
        birdName="Blue Robin"
        hintError={null}
        hintErrorType={null}
        hintLoading={{ fact: false, image: false }}
        hints={{ fact: { type: 'fact', content: 'Bright blue feathers.' }, image: null }}
        onRequestHint={vi.fn()}
        state="question"
        seedsBalance={100}
        onAnswer={vi.fn()}
      />
    );

    expect(playMock).toHaveBeenCalledWith('hintReveal');
  });

  it('waits for the image to load before playing the hint reveal chime', () => {
    vi.useFakeTimers();

    const { rerender } = render(
      <BirdCard
        birdName="Blue Robin"
        hintError={null}
        hintErrorType={null}
        hintLoading={{ fact: false, image: true }}
        hints={{ fact: null, image: null }}
        onRequestHint={vi.fn()}
        state="question"
        seedsBalance={100}
        onAnswer={vi.fn()}
      />
    );

    expect(playMock).toHaveBeenCalledWith('hintImageLoading');

    rerender(
      <BirdCard
        birdName="Blue Robin"
        hintError={null}
        hintErrorType={null}
        hintLoading={{ fact: false, image: false }}
        hints={{ fact: null, image: { type: 'image', content: 'https://example.com/blue-robin.jpg' } }}
        onRequestHint={vi.fn()}
        state="question"
        seedsBalance={100}
        onAnswer={vi.fn()}
      />
    );

    expect(playMock).not.toHaveBeenCalledWith('hintReveal');

    fireEvent.load(screen.getByRole('img', { name: 'Hint image for Blue Robin' }));

    expect(playMock).toHaveBeenCalledWith('hintReveal');
  });
});