import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyProgressEvents,
  claimMissionRewardDirect,
  claimMissionSetBonusDirect,
  fetchAccountState,
  fetchWeeklyLeaderboard,
  pullAccountProgress,
  purchaseStreakInsuranceDirect,
  purchaseTheme,
  registerAccount,
  resolveSignInIdentifier,
  saveAvatarPalette,
  saveProfile,
  syncBirdhouse,
  syncBirdJournal,
  syncDailyMissionCompletion,
  syncLocalProgress,
} from './account-sync';

describe('account-sync', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts each account action to /api/auth with the expected payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    const progress = {
      score: { seeds: 10 },
      unlockedThemes: ['Finch'],
      dailyChallengeHistory: [],
      dailyMissionHistory: [],
      milestones: [10],
      journalEntries: [],
      birdhouse: { real: [], fake: [], updatedAt: '2026-04-07T00:00:00.000Z' },
    } as never;
    const events = [{ eventId: 'e1' }] as never;

    await fetchAccountState(controller.signal);
    await registerAccount({ username: 'birder', email: 'bird@example.com', password: 'password123' });
    await fetchWeeklyLeaderboard(controller.signal);
    await resolveSignInIdentifier('bird@example.com');
    await saveProfile('birder');
    await saveAvatarPalette('Robin');
    await syncLocalProgress(progress);
    await syncBirdJournal([{ birdKey: 'real:blue-jay' }] as never);
    await syncBirdhouse({ real: ['real:blue-jay'], fake: [], updatedAt: '2026-04-07T00:00:00.000Z' } as never);
    await syncDailyMissionCompletion('2026-04-07');
    await pullAccountProgress('2026-04-07');
    await purchaseTheme('Robin');
    await applyProgressEvents(events);
    await purchaseStreakInsuranceDirect();
    await claimMissionRewardDirect({ claimId: 'm1', rewardSeeds: 8 });
    await claimMissionSetBonusDirect({ claimId: 'bonus', rewardSeeds: 15 });

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/auth', expect.objectContaining({
      method: 'POST',
      signal: controller.signal,
      body: JSON.stringify({ action: 'get-account-state' }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/auth', expect.objectContaining({
      body: JSON.stringify({ action: 'register-account', username: 'birder', email: 'bird@example.com', password: 'password123' }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/auth', expect.objectContaining({
      signal: controller.signal,
      body: JSON.stringify({ action: 'get-leaderboard' }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(4, '/api/auth', expect.objectContaining({
      body: JSON.stringify({ action: 'resolve-sign-in-identifier', identifier: 'bird@example.com' }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(5, '/api/auth', expect.objectContaining({
      body: JSON.stringify({ action: 'save-profile', username: 'birder', avatarPalette: 'finch' }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(6, '/api/auth', expect.objectContaining({
      body: JSON.stringify({ action: 'save-avatar-palette', avatarPalette: 'Robin' }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(7, '/api/auth', expect.objectContaining({
      body: JSON.stringify({ action: 'sync-local-progress', progress }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(8, '/api/auth', expect.objectContaining({
      body: JSON.stringify({ action: 'sync-bird-journal', journalEntries: [{ birdKey: 'real:blue-jay' }] }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(9, '/api/auth', expect.objectContaining({
      body: JSON.stringify({ action: 'sync-birdhouse', birdhouse: { real: ['real:blue-jay'], fake: [], updatedAt: '2026-04-07T00:00:00.000Z' } }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(10, '/api/auth', expect.objectContaining({
      body: JSON.stringify({ action: 'sync-daily-mission-completion', date: '2026-04-07' }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(11, '/api/auth', expect.objectContaining({
      body: JSON.stringify({ action: 'pull-account-progress', missionDate: '2026-04-07' }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(12, '/api/auth', expect.objectContaining({
      body: JSON.stringify({ action: 'purchase-theme', themeName: 'Robin' }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(13, '/api/auth', expect.objectContaining({
      body: JSON.stringify({ action: 'apply-progress-events', events }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(14, '/api/auth', expect.objectContaining({
      body: JSON.stringify({ action: 'purchase-streak-insurance' }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(15, '/api/auth', expect.objectContaining({
      body: JSON.stringify({ action: 'claim-mission-reward', claimId: 'm1', rewardSeeds: 8 }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(16, '/api/auth', expect.objectContaining({
      body: JSON.stringify({ action: 'claim-mission-set-bonus', claimId: 'bonus', rewardSeeds: 15 }),
    }));
  });

  it.each([
    [{ message: 'Specific message' }, 'Specific message'],
    [{ error: 'username_unavailable' }, 'That username is no longer available.'],
    [{ error: 'invalid_username', issues: ['too_short', 'invalid_characters'] }, 'Username issue: too_short, invalid_characters'],
    [{ error: 'invalid_username' }, 'That username is invalid.'],
    [{ error: 'not_authenticated' }, 'Sign in first to manage account sync.'],
    [{ error: 'invalid_email' }, 'Enter a valid email address.'],
    [{ error: 'invalid_password' }, 'Choose a password with at least 8 characters.'],
    [{ error: 'account_creation_failed' }, 'Unable to create the account.'],
    [{ error: 'insurance_already_active' }, 'Streak insurance is already armed for your next guess.'],
    [{ error: 'insurance_streak_too_low' }, 'Build a 5-bird streak before buying streak insurance.'],
    [{ error: 'insufficient_seeds' }, 'You do not have enough seeds for streak insurance.'],
    [{ error: 'insurance_purchase_failed' }, 'Unable to buy streak insurance right now.'],
  ])('maps auth API errors to user-facing messages: %j', async (payload, expectedMessage) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => payload,
    }));

    await expect(fetchAccountState()).rejects.toThrow(expectedMessage);
  });

  it('falls back to the generic message when the error payload cannot be read', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => {
        throw new Error('bad json');
      },
    }));

    await expect(fetchWeeklyLeaderboard()).rejects.toThrow('Unable to complete account action.');
  });
});
