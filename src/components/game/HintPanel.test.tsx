import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HintPanel from './HintPanel';

describe('HintPanel', () => {
  it('expands to show both hint options', () => {
    render(
      <HintPanel
        birdName="Blue Jay"
        hintError={null}
        hintErrorType={null}
        hintLoading={{ fact: false, image: false }}
        hints={{ fact: null, image: null }}
        onRequestHint={vi.fn()}
        seedsBalance={75}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /get a hint/i }));

    expect(screen.getByRole('button', { name: /field note/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /photo/i })).toBeInTheDocument();
  });

  it('passes hint requests through to the caller', () => {
    const onRequestHint = vi.fn();
    render(
      <HintPanel
        birdName="Blue Jay"
        hintError={null}
        hintErrorType={null}
        hintLoading={{ fact: false, image: false }}
        hints={{ fact: null, image: null }}
        onRequestHint={onRequestHint}
        seedsBalance={75}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /get a hint/i }));
    fireEvent.click(screen.getByRole('button', { name: /field note/i }));

    expect(onRequestHint).toHaveBeenCalledWith('fact');
  });

  it('shows purchased hint content and disables repurchase', () => {
    render(
      <HintPanel
        birdName="Blue Jay"
        hintError={null}
        hintErrorType={null}
        hintLoading={{ fact: false, image: false }}
        hints={{
          fact: { type: 'fact', content: 'A fact about this bird.' },
          image: null,
        }}
        onRequestHint={vi.fn()}
        seedsBalance={75}
      />
    );

    expect(screen.getByText('A fact about this bird.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /field note/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /photo/i })).toBeInTheDocument();
  });

  it('lets the player close the panel after a hint has been revealed', () => {
    render(
      <HintPanel
        birdName="Blue Jay"
        hintError={null}
        hintErrorType={null}
        hintLoading={{ fact: false, image: false }}
        hints={{
          fact: { type: 'fact', content: 'A fact about this bird.' },
          image: null,
        }}
        onRequestHint={vi.fn()}
        seedsBalance={75}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /get a hint/i }));

    expect(screen.getByRole('button', { name: /get a hint/i })).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows an insufficient seeds state for unaffordable hints', () => {
    render(
      <HintPanel
        birdName="Blue Jay"
        hintError={null}
        hintErrorType={null}
        hintLoading={{ fact: false, image: false }}
        hints={{ fact: null, image: null }}
        onRequestHint={vi.fn()}
        seedsBalance={5}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /get a hint/i }));

    expect(screen.getByRole('button', { name: /field note/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /photo/i })).toBeDisabled();
  });

  it('shows a richer loading preview while hints are being fetched', () => {
    render(
      <HintPanel
        birdName="Blue Jay"
        hintError={null}
        hintErrorType={'fact'}
        hintLoading={{ fact: true, image: false }}
        hints={{ fact: null, image: null }}
        onRequestHint={vi.fn()}
        seedsBalance={75}
      />
    );

    expect(screen.getByText('Consulting a real fake ornithologist...')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /field note/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /photo/i })).toBeInTheDocument();
  });

  it('shows image hint loading state', () => {
    render(
      <HintPanel
        birdName="Blue Jay"
        hintError={null}
        hintErrorType={'image'}
        hintLoading={{ fact: false, image: true }}
        hints={{ fact: null, image: null }}
        onRequestHint={vi.fn()}
        seedsBalance={75}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /get a hint/i }));

    expect(screen.getByText('Seeking a real fake wildlife photographer...')).toBeInTheDocument();
  });

  it('surfaces a previously stored image hint in the panel', () => {
    render(
      <HintPanel
        birdName="Blue Jay"
        hintError={null}
        hintErrorType={null}
        hintLoading={{ fact: false, image: false }}
        hints={{
          fact: null,
          image: { type: 'image', content: 'https://images.example.com/bird.jpg' },
        }}
        onRequestHint={vi.fn()}
        seedsBalance={75}
      />
    );

    expect(screen.getByAltText('Hint image for Blue Jay')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /field note/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /photo/i })).not.toBeInTheDocument();
  });

  it('shows inline refunded failure state in the failed hint slot', () => {
    const onRequestHint = vi.fn();

    render(
      <HintPanel
        birdName="Blue Jay"
        hintError="Request failed. Your seeds were refunded."
        hintErrorType="fact"
        hintLoading={{ fact: false, image: false }}
        hints={{ fact: null, image: null }}
        onRequestHint={onRequestHint}
        seedsBalance={75}
      />
    );

    expect(screen.getByText('Field note request failed')).toBeInTheDocument();
    expect(screen.getByText('Request failed. Your seeds were refunded.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /field note/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /photo/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRequestHint).toHaveBeenCalledWith('fact');
  });

  it('hides the panel entirely when both hints have been purchased', () => {
    const { container } = render(
      <HintPanel
        birdName="Blue Jay"
        hintError={null}
        hintErrorType={null}
        hintLoading={{ fact: false, image: false }}
        hints={{
          fact: { type: 'fact', content: 'A fact about this bird.' },
          image: { type: 'image', content: 'https://images.example.com/bird.jpg' },
        }}
        onRequestHint={vi.fn()}
        seedsBalance={75}
      />
    );

    expect(container.innerHTML).toBe('');
    expect(screen.queryByRole('button', { name: /get a hint/i })).not.toBeInTheDocument();
  });
});