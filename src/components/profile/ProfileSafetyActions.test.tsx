import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfileSafetyActions from './ProfileSafetyActions';

describe('ProfileSafetyActions', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('submits a block request and notifies the parent', async () => {
    const onBlocked = vi.fn();
    const onUnblocked = vi.fn().mockResolvedValue(undefined);
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true, relationship: 'blocked' }),
    } as unknown as Response);

    render(
      <ProfileSafetyActions
        targetUsername="birdlover"
        blockState="none"
        onBlocked={onBlocked}
        onUnblocked={onUnblocked}
      />,
    );

    fireEvent.click(screen.getByLabelText('Open profile safety actions'));
    fireEvent.click(screen.getByRole('menuitem', { name: /block player/i }));
    fireEvent.click(screen.getByRole('button', { name: /block player/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/block', expect.objectContaining({
        method: 'POST',
      }));
    });
    expect(onBlocked).toHaveBeenCalledTimes(1);
    expect(screen.getByText('@birdlover has been blocked.')).toBeInTheDocument();
  });

  it('submits an unblock request and refreshes through the parent callback', async () => {
    const onBlocked = vi.fn();
    const onUnblocked = vi.fn().mockResolvedValue(undefined);
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true, relationship: 'none' }),
    } as unknown as Response);

    render(
      <ProfileSafetyActions
        targetUsername="birdlover"
        blockState="viewer_blocked_target"
        onBlocked={onBlocked}
        onUnblocked={onUnblocked}
      />,
    );

    fireEvent.click(screen.getByLabelText('Open profile safety actions'));
    fireEvent.click(screen.getByRole('menuitem', { name: /unblock player/i }));
    fireEvent.click(screen.getByRole('button', { name: /^unblock$/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/block', expect.objectContaining({
        method: 'POST',
      }));
    });
    expect(onBlocked).not.toHaveBeenCalled();
    expect(onUnblocked).toHaveBeenCalledTimes(1);
    expect(screen.getByText('@birdlover has been unblocked.')).toBeInTheDocument();
  });

  it('submits a report with the selected reason and note', async () => {
    const onBlocked = vi.fn();
    const onUnblocked = vi.fn().mockResolvedValue(undefined);
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true }),
    } as unknown as Response);

    render(
      <ProfileSafetyActions
        targetUsername="birdlover"
        blockState="none"
        onBlocked={onBlocked}
        onUnblocked={onUnblocked}
      />,
    );

    fireEvent.click(screen.getByLabelText('Open profile safety actions'));
    fireEvent.click(screen.getByRole('menuitem', { name: /report profile/i }));

    const dialog = screen.getByRole('dialog', { name: /report @birdlover/i });
    fireEvent.click(within(dialog).getByRole('button', { name: /spam/i }));
    fireEvent.change(within(dialog).getByRole('textbox', { name: /optional note/i }), {
      target: { value: 'Repeated scam links in profile details.' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /submit report/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/report/profile', expect.objectContaining({
        method: 'POST',
      }));
    });
    expect(fetch).toHaveBeenLastCalledWith('/api/report/profile', expect.objectContaining({
      body: JSON.stringify({
        targetUsername: 'birdlover',
        reason: 'spam',
        note: 'Repeated scam links in profile details.',
      }),
    }));
    expect(screen.getByText('Thanks. Your report was submitted for review.')).toBeInTheDocument();
  });

  it('surfaces API errors for report submissions', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: 'rate_limited' }),
    } as unknown as Response);

    render(
      <ProfileSafetyActions
        targetUsername="birdlover"
        blockState="none"
        onBlocked={vi.fn()}
        onUnblocked={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByLabelText('Open profile safety actions'));
    fireEvent.click(screen.getByRole('menuitem', { name: /report profile/i }));
    fireEvent.click(screen.getByRole('button', { name: /submit report/i }));

    await waitFor(() => {
      expect(screen.getByText('Too many reports were sent too quickly. Please wait and try again.')).toBeInTheDocument();
    });
  });

  it('closes the menu when Escape is pressed', async () => {
    render(
      <ProfileSafetyActions
        targetUsername="birdlover"
        blockState="none"
        onBlocked={vi.fn()}
        onUnblocked={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByLabelText('Open profile safety actions'));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('surfaces block API errors and keeps the dialog open', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: 'target_not_found' }),
    } as unknown as Response);

    render(
      <ProfileSafetyActions
        targetUsername="birdlover"
        blockState="none"
        onBlocked={vi.fn()}
        onUnblocked={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByLabelText('Open profile safety actions'));
    fireEvent.click(screen.getByRole('menuitem', { name: /block player/i }));
    fireEvent.click(screen.getByRole('button', { name: /block player/i }));

    await waitFor(() => {
      expect(screen.getByText('That player profile could not be found.')).toBeInTheDocument();
    });
    expect(screen.getByRole('dialog', { name: /block @birdlover\?/i })).toBeInTheDocument();
  });

  it('closes the report dialog when the overlay is clicked', async () => {
    render(
      <ProfileSafetyActions
        targetUsername="birdlover"
        blockState="none"
        onBlocked={vi.fn()}
        onUnblocked={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByLabelText('Open profile safety actions'));
    fireEvent.click(screen.getByRole('menuitem', { name: /report profile/i }));

    const dialog = screen.getByRole('dialog', { name: /report @birdlover/i });
    fireEvent.click(dialog.parentElement as HTMLElement);

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /report @birdlover/i })).not.toBeInTheDocument();
    });
  });

  it('uses an internal scroll region for the report dialog content', async () => {
    render(
      <ProfileSafetyActions
        targetUsername="birdlover"
        blockState="none"
        onBlocked={vi.fn()}
        onUnblocked={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByLabelText('Open profile safety actions'));
    fireEvent.click(screen.getByRole('menuitem', { name: /report profile/i }));

    const dialog = screen.getByRole('dialog', { name: /report @birdlover/i });
    const content = screen.getByTestId('profile-report-dialog-content');

    expect(dialog).toHaveStyle({ maxHeight: 'min(85svh, 720px)' });
    expect(content.className).toContain('overflow-y-auto');
  });
});
