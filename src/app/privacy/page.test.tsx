import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PrivacyPolicyPage from './page';

describe('PrivacyPolicyPage', () => {
  it('renders the main heading', () => {
    render(<PrivacyPolicyPage />);
    expect(screen.getByRole('heading', { name: /privacy policy/i, level: 1 })).toBeInTheDocument();
  });

  it('renders key sections', () => {
    render(<PrivacyPolicyPage />);
    expect(screen.getByRole('heading', { name: /information we collect/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /third-party services/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /children/i })).toBeInTheDocument();
  });

  it('includes the privacy contact email', () => {
    render(<PrivacyPolicyPage />);
    expect(screen.getByRole('link', { name: /campbell\.ryan\.r@gmail\.com/i })).toBeInTheDocument();
  });

  it('links to the terms page', () => {
    render(<PrivacyPolicyPage />);
    expect(screen.getByRole('link', { name: /terms of service/i })).toHaveAttribute('href', '/terms');
  });
});
