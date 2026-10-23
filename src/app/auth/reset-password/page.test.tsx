import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSessionMock, updateUserMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  updateUserMock: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/supabase/env', () => ({
  hasSupabaseEnv: vi.fn(() => true),
}));

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowserClient: () => ({
    auth: {
      getSession: getSessionMock,
      updateUser: updateUserMock,
    },
  }),
}));

import ResetPasswordPage from './page';

describe('reset password page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null });
    updateUserMock.mockResolvedValue({ error: null });
  });

  it('updates the password for the verified recovery session', async () => {
    render(<ResetPasswordPage />);

    const passwordInput = await screen.findByLabelText('New password');
    fireEvent.change(passwordInput, { target: { value: 'new-password-123' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'new-password-123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() => {
      expect(updateUserMock).toHaveBeenCalledWith({ password: 'new-password-123' });
    });
    expect(await screen.findByRole('heading', { name: 'Password updated' })).toBeInTheDocument();
  });

  it('offers a new reset request when the link has no session', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });
    render(<ResetPasswordPage />);

    expect(await screen.findByText(/This reset link is invalid or has expired/)).toBeInTheDocument();
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
  });
});
