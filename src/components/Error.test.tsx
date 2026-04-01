import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Error from './Error';

describe('Error', () => {
  it('renders the error state and retries in place on click', () => {
    const onTryAgain = vi.fn();

    render(<Error onTryAgain={onTryAgain} />);

    expect(screen.getByText('No birds found')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Look Again' }));
    expect(onTryAgain).toHaveBeenCalledTimes(1);
  });
});