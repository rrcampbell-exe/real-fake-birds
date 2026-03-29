import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LoadingState from './LoadingState';

describe('LoadingState', () => {
  it('renders loading copy and animated dots', () => {
    const { container } = render(<LoadingState />);

    expect(screen.getByText(/bird watching/i)).toBeInTheDocument();
    expect(container.querySelectorAll('span').length).toBe(3);
  });
});