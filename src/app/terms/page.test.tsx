import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TermsOfServicePage from './page';

describe('TermsOfServicePage', () => {
  it('renders the main heading', () => {
    render(<TermsOfServicePage />);
    expect(screen.getByRole('heading', { name: /terms of service/i, level: 1 })).toBeInTheDocument();
  });

  it('renders key sections', () => {
    render(<TermsOfServicePage />);
    expect(screen.getByRole('heading', { name: /acceptable use/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /intellectual property/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /disclaimer of warranties/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /limitation of liability/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /profiles and social features/i })).toBeInTheDocument();
  });

  it('describes public and private profile behavior and social actions', () => {
    render(<TermsOfServicePage />);
    expect(document.body).toHaveTextContent(/profiles are public by default/i);
    expect(document.body).toHaveTextContent(/following a private profile sends a request/i);
    expect(document.body).toHaveTextContent(/you may block other accounts/i);
    expect(document.body).toHaveTextContent(/submit a report about another profile/i);
    expect(document.body).toHaveTextContent(/you may delete your account/i);
  });

  it('includes the contact email', () => {
    render(<TermsOfServicePage />);
    expect(screen.getByRole('link', { name: /campbell\.ryan\.r@gmail\.com/i })).toBeInTheDocument();
  });

  it('links to the privacy page', () => {
    render(<TermsOfServicePage />);
    expect(
      screen.getAllByRole('link', { name: /privacy policy/i })
        .some((link) => link.getAttribute('href') === '/privacy'),
    ).toBe(true);
  });
});
