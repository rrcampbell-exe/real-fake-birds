import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: vi.fn(() => false),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
    aside: ({ children, ...props }: React.ComponentProps<'aside'>) => <aside {...props}>{children}</aside>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import OnboardingOverlay from './OnboardingOverlay';

describe('OnboardingOverlay', () => {
  const onDismiss = vi.fn();

  beforeEach(() => {
    onDismiss.mockReset();
  });

  it('renders the first step heading', () => {
    render(<OnboardingOverlay onDismiss={onDismiss} />);
    expect(screen.getByRole('heading', { name: /welcome to real fake birds/i })).toBeInTheDocument();
  });

  it('skip button calls onDismiss', () => {
    render(<OnboardingOverlay onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /skip onboarding/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('skip text link calls onDismiss', () => {
    render(<OnboardingOverlay onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /^skip$/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('Next button advances to step 2', () => {
    render(<OnboardingOverlay onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByRole('heading', { name: /real or fake\?/i })).toBeInTheDocument();
  });

  it('shows "Start playing" on the final step', () => {
    render(<OnboardingOverlay onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByRole('button', { name: /start playing/i })).toBeInTheDocument();
  });

  it('Start playing button on the final step calls onDismiss', () => {
    render(<OnboardingOverlay onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /start playing/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('backdrop click calls onDismiss', () => {
    render(<OnboardingOverlay onDismiss={onDismiss} />);
    // The backdrop is the first motion.div child (aria-hidden)
    const backdrop = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    fireEvent.click(backdrop);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
