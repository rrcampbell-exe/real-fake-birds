import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Error from './Error';

describe('Error', () => {
  const reload = vi.fn();

  beforeEach(() => {
    reload.mockReset();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    });
  });

  it('renders the error state and reloads on click', () => {
    render(<Error />);

    expect(screen.getByText('No birds found')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Look Again' }));
    expect(reload).toHaveBeenCalled();
  });
});