import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoadingState from './LoadingState';

vi.mock('@/hooks/useSound', () => ({
  useSound: () => ({ startLoop: vi.fn(), stopLoop: vi.fn() }),
}));

vi.mock('@/hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: vi.fn(),
}));

import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

describe('LoadingState', () => {
  beforeEach(() => {
    vi.mocked(usePrefersReducedMotion).mockReturnValue(false);
  });

  it('renders animated motion.span dots when reduced motion is off', () => {
    render(<LoadingState />);
    expect(screen.getByText(/bird watching/i)).toBeInTheDocument();
  });

  it('renders plain span dots when reduced motion is preferred', () => {
    vi.mocked(usePrefersReducedMotion).mockReturnValue(true);
    const { container } = render(<LoadingState />);
    expect(screen.getByText(/bird watching/i)).toBeInTheDocument();
    expect(container.querySelectorAll('span').length).toBe(3);
  });
});
