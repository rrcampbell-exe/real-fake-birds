import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HintPanel from './HintPanel';

describe('HintPanel', () => {
  it('expands to show only the fact hint option', () => {
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

    expect(screen.getByRole('button', { name: /request a fact/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /image hint/i })).not.toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: /request a fact/i }));

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
    expect(screen.queryByRole('button', { name: /request a fact/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /image hint/i })).not.toBeInTheDocument();
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

    expect(screen.getByRole('button', { name: /request a fact/i })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /image hint/i })).not.toBeInTheDocument();
  });

  it('renders a contextual skip option when provided', () => {
    const onRequest = vi.fn();

    render(
      <HintPanel
        birdName="Blue Jay"
        hintError={null}
        hintErrorType={null}
        hintLoading={{ fact: false, image: false }}
        hints={{ fact: null, image: null }}
        onRequestHint={vi.fn()}
        seedsBalance={75}
        specialAction={{
          type: 'skip',
          title: 'Skip This Bird',
          description: 'Pass on this first encounter and spot a new bird immediately.',
          cost: 18,
          disabled: false,
          onRequest,
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /get a hint/i }));
    fireEvent.click(screen.getByRole('button', { name: /skip this bird/i }));

    expect(onRequest).toHaveBeenCalled();
  });

  it('shows a reveal preview after a journal unlock', () => {
    render(
      <HintPanel
        birdName="Blue Jay"
        hintError={null}
        hintErrorType={null}
        hintLoading={{ fact: false, image: false }}
        hints={{ fact: null, image: null }}
        onRequestHint={vi.fn()}
        seedsBalance={75}
        specialAction={{
          type: 'reveal',
          title: 'Reveal This Bird',
          description: 'See whether this bird is real or fake for this round only.',
          cost: 32,
          disabled: false,
          onRequest: vi.fn(),
          previewTitle: 'Round Reveal',
          previewContent: 'Blue Jay is a real bird.',
        }}
      />
    );

    expect(screen.getByText('Round Reveal')).toBeInTheDocument();
    expect(screen.getByText('Blue Jay is a real bird.')).toBeInTheDocument();
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
    expect(screen.queryByRole('button', { name: /request a fact/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /image hint/i })).not.toBeInTheDocument();
  });

  it('hides the image hint option entirely', () => {
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

    expect(screen.queryByRole('button', { name: /image hint/i })).not.toBeInTheDocument();
  });

  it('does not surface a previously stored image hint in the panel', () => {
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

    fireEvent.click(screen.getByRole('button', { name: /get a hint/i }));

    expect(screen.queryByAltText('Hint image for Blue Jay')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request a fact/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /image hint/i })).not.toBeInTheDocument();
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

    expect(screen.getByText('Fact request failed')).toBeInTheDocument();
    expect(screen.getByText('Request failed. Your seeds were refunded.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /request a fact/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /image hint/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRequestHint).toHaveBeenCalledWith('fact');
  });
});