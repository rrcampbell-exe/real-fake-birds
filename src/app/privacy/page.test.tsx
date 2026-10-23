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
    expect(screen.getByRole('heading', { name: /profile visibility/i })).toBeInTheDocument();
  });

  it('accurately describes analytics identity and consent', () => {
    render(<PrivacyPolicyPage />);
    expect(document.body).toHaveTextContent(/identify events using your username/i);
    expect(document.body).toHaveTextContent(/this analytics is not anonymous for signed-in players/i);
    expect(document.body).toHaveTextContent(/the analytics prompt offers.*allow analytics.*no thanks/i);
    expect(document.body).toHaveTextContent(/do not track is not used to set this choice/i);
    expect(document.body).toHaveTextContent(/vercel analytics.*not gated by that choice/i);
  });

  it('describes profile visibility, social data, guest storage, and account deletion', () => {
    render(<PrivacyPolicyPage />);
    expect(document.body).toHaveTextContent(/follow relationships and request status, blocks, and profile reports/i);
    expect(document.body).toHaveTextContent(/profiles are public by default/i);
    expect(document.body).toHaveTextContent(/on the web, you can play without an account/i);
    expect(document.body).toHaveTextContent(/guest play is available when offline/i);
    expect(document.body).toHaveTextContent(/deletion flow deletes your supabase auth account/i);
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
