import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('posthog-js', () => ({
  default: {
    opt_in_capturing: vi.fn(),
    opt_out_capturing: vi.fn(),
  },
}));

vi.mock('@/lib/analytics/consent', () => ({
  getAnalyticsConsent: vi.fn(() => null),
  setAnalyticsConsent: vi.fn(),
  requiresAnalyticsConsent: vi.fn(() => true),
}));

vi.mock('@/hooks/useHasHydrated', () => ({
  useHasHydrated: vi.fn(() => true),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import ConsentModal from './ConsentModal';
import { getAnalyticsConsent, setAnalyticsConsent, requiresAnalyticsConsent } from '@/lib/analytics/consent';
import { useHasHydrated } from '@/hooks/useHasHydrated';
import posthog from 'posthog-js';

describe('ConsentModal', () => {
  beforeEach(() => {
    vi.mocked(getAnalyticsConsent).mockReturnValue(null);
    vi.mocked(requiresAnalyticsConsent).mockReturnValue(true);
    vi.mocked(useHasHydrated).mockReturnValue(true);
  });

  it('renders the modal when consent has not been given', () => {
    render(<ConsentModal />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Help improve Real Fake Birds?')).toBeInTheDocument();
    expect(dialog.className).toContain('bg-[var(--color-modal-bg)]');
  });

  it('renders nothing when consent is already accepted', () => {
    vi.mocked(getAnalyticsConsent).mockReturnValue('accepted');
    const { container } = render(<ConsentModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when consent is already declined', () => {
    vi.mocked(getAnalyticsConsent).mockReturnValue('declined');
    const { container } = render(<ConsentModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it('accepting saves consent, opts in to posthog, and dispatches the consent-changed event', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    render(<ConsentModal />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Allow analytics' }));
    });

    expect(setAnalyticsConsent).toHaveBeenCalledWith('accepted');
    expect(posthog.opt_in_capturing).toHaveBeenCalled();
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'analytics-consent-changed' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('declining saves consent, opts out of posthog, and dispatches the consent-changed event', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    render(<ConsentModal />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'No thanks' }));
    });

    expect(setAnalyticsConsent).toHaveBeenCalledWith('declined');
    expect(posthog.opt_out_capturing).toHaveBeenCalled();
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'analytics-consent-changed' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders nothing when not yet hydrated', () => {
    vi.mocked(useHasHydrated).mockReturnValue(false);

    const { container } = render(<ConsentModal />);
    expect(container).toBeEmptyDOMElement();
  });

  describe('region gating', () => {
    it('shows the modal for EU users with no prior consent', () => {
      vi.mocked(requiresAnalyticsConsent).mockReturnValue(true);
      render(<ConsentModal />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('shows the modal when region cookie is absent (fail-open)', () => {
      // requiresAnalyticsConsent returns true for absent cookie
      vi.mocked(requiresAnalyticsConsent).mockReturnValue(true);
      render(<ConsentModal />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not show the modal for non-EU users and silently accepts consent', () => {
      vi.mocked(requiresAnalyticsConsent).mockReturnValue(false);
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      const { container } = render(<ConsentModal />);

      expect(container).toBeEmptyDOMElement();
      expect(setAnalyticsConsent).toHaveBeenCalledWith('accepted');
      expect(posthog.opt_in_capturing).toHaveBeenCalled();
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'analytics-consent-changed' }),
      );
    });

    it('does not overwrite an existing consent choice for non-EU users', () => {
      vi.mocked(requiresAnalyticsConsent).mockReturnValue(false);
      vi.mocked(getAnalyticsConsent).mockReturnValue('declined');

      render(<ConsentModal />);

      expect(setAnalyticsConsent).not.toHaveBeenCalled();
    });
  });
});
