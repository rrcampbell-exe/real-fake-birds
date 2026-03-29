import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HintButton from './HintButton';

describe('HintButton', () => {
  it('renders a disabled hint button with the requested number of remaining reveals', () => {
    const { container } = render(<HintButton disabled revealsRemaining={3} />);

    expect(screen.getByRole('button', { name: /show bird/i })).toBeDisabled();
    expect(screen.getByText('Show a picture of this bird — coming soon!')).toBeInTheDocument();
    expect(container.querySelectorAll('span[class*="w-1.5"][class*="h-1.5"]').length).toBe(5);
  });
});