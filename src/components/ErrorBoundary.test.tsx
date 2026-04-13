import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ErrorBoundary from './ErrorBoundary';

function BrokenBird() {
  throw new Error('birds broke');

  return null;
}

describe('ErrorBoundary', () => {
  it('renders its children when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <div>Birdsong intact</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Birdsong intact')).toBeInTheDocument();
  });

  it('renders the thematic fallback and reload action when a child throws', () => {
    const reload = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload },
    });

    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <BrokenBird />
      </ErrorBoundary>
    );

    expect(screen.getByText('Hmm. The birds have gone quiet.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rustle Them Up' }));
    expect(reload).toHaveBeenCalled();
  });
});