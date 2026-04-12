import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Error from './Error';

describe('Error', () => {
  it('renders the server error state and retries on click', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
    const onTryAgain = vi.fn();

    render(<Error onTryAgain={onTryAgain} />);

    expect(screen.getByText('No birds found')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Look Again' }));
    expect(onTryAgain).toHaveBeenCalledTimes(1);
  });

  it('renders the offline state when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });

    render(<Error onTryAgain={vi.fn()} />);

    expect(screen.getByText("You're offline. Check your connection.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
  });

  it('switches to offline message when the offline event fires', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });

    render(<Error onTryAgain={vi.fn()} />);
    expect(screen.getByText('No birds found')).toBeInTheDocument();

    fireEvent(window, new Event('offline'));

    expect(screen.getByText("You're offline. Check your connection.")).toBeInTheDocument();
  });
});
