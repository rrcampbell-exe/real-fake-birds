'use client';

import { useEffect, useState } from 'react';
import { Check, Music4, Volume2, VolumeX } from 'lucide-react';
import { themes } from '@/lib/themes';
import { resolveTheme, setTheme } from '@/lib/utils/theme-handler';
import { finch } from '@/lib/themes';
import { useStoredJson } from '@/hooks/useStoredValue';
import { useSound } from '@/hooks/useSound';
import SeedIcon from '@/components/icons/SeedIcon';
import { getThemeUnlockByThemeName } from '@/lib/constants/theme-unlocks';
import {
  defaultBirdScore,
  getUnlockedThemeNames,
  isThemeUnlocked,
  NEW_THEME_UNLOCK_STORAGE_KEY,
  normalizeBirdScore,
  readBirdScore,
  setStoredBoolean,
  UNLOCKED_THEMES_STORAGE_KEY,
  unlockThemeName,
  writeBirdScore,
} from '@/lib/utils/player-progress';

export default function SettingsPage() {
  const [showIosAudioNotice, setShowIosAudioNotice] = useState(false);
  const storedTheme = useStoredJson('birdTheme', finch);
  const storedScore = useStoredJson<typeof defaultBirdScore | null>('birdScore', defaultBirdScore);
  const storedUnlockedThemeNames = useStoredJson<string[]>(UNLOCKED_THEMES_STORAGE_KEY, []);
  const score = normalizeBirdScore(storedScore);
  const currentTheme = resolveTheme(storedTheme);
  const unlockedThemeNames = new Set(
    [...getUnlockedThemeNames(score), ...storedUnlockedThemeNames]
  );
  const [pendingPurchaseThemeName, setPendingPurchaseThemeName] = useState<string | null>(null);
  const {
    isSfxMuted,
    sfxVolume,
    isMusicMuted,
    musicVolume,
    setSfxMuted,
    setSfxVolume,
    setMusicMuted,
    setMusicVolume,
    play,
  } = useSound();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const { userAgent, platform, maxTouchPoints } = window.navigator;
    const isIosDevice = /iPad|iPhone|iPod/.test(userAgent)
      || (platform === 'MacIntel' && maxTouchPoints > 1);

    setShowIosAudioNotice(isIosDevice);
  }, []);

  useEffect(() => {
    setStoredBoolean(NEW_THEME_UNLOCK_STORAGE_KEY, false);
  }, []);

  const handleThemeChange = (theme: typeof finch) => {
    if (!isThemeUnlocked(theme.name, score)) {
      handleLockedThemeClick(theme.name);
      return;
    }

    setPendingPurchaseThemeName(null);
    setTheme(theme);
    document.documentElement.setAttribute('data-theme', theme.name);
    play('themeChange');
  };

  const pendingPurchase = pendingPurchaseThemeName
    ? getThemeUnlockByThemeName(pendingPurchaseThemeName)
    : undefined;
  const canAffordPendingPurchase = pendingPurchase ? score.seeds >= pendingPurchase.seedCost : false;
  const pendingBirdsRemaining = pendingPurchase
    ? Math.max(pendingPurchase.milestoneValue - score.birdsIdentified, 0)
    : 0;
  const pendingSeedsRemaining = pendingPurchase
    ? Math.max(pendingPurchase.seedCost - score.seeds, 0)
    : 0;

  const handleLockedThemeClick = (themeName: string) => {
    setPendingPurchaseThemeName(themeName);
    play('navTap');
  };

  useEffect(() => {
    if (!pendingPurchaseThemeName) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPendingPurchaseThemeName(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [pendingPurchaseThemeName]);

  const handleThemePurchase = () => {
    if (!pendingPurchase || pendingPurchase.comingSoon || !canAffordPendingPurchase) {
      return;
    }

    const currentScore = readBirdScore();
    const updatedScore = writeBirdScore({
      ...currentScore,
      seeds: currentScore.seeds - pendingPurchase.seedCost,
    });

    unlockThemeName(pendingPurchase.themeName);

    const purchasedTheme = themes.find((theme) => theme.name === pendingPurchase.themeName);
    if (purchasedTheme) {
      setTheme(purchasedTheme);
      document.documentElement.setAttribute('data-theme', purchasedTheme.name);
      play('themeChange');
    }

    if (updatedScore.seeds >= 0) {
      setPendingPurchaseThemeName(null);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 flex flex-col gap-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold mb-1">
          Settings
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Customize your experience.
        </p>
      </div>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold mb-3">
          Sound
        </h2>
        <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-surface-border)] flex flex-col gap-4">
          {showIosAudioNotice && (
            <p className="rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] px-3 py-2 text-xs leading-relaxed text-[var(--color-muted)]">
              iPhone audio respects Silent Mode in Safari and Chrome. If sound is missing, turn Silent Mode off.
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isSfxMuted ? (
                <VolumeX size={18} className="text-[var(--color-muted)]" />
              ) : (
                <Volume2 size={18} className="text-[var(--color-secondary)]" />
              )}
              <span className="text-sm font-medium">Sound Effects</span>
            </div>
            <button
              onClick={() => setSfxMuted(!isSfxMuted)}
              className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                isSfxMuted ? 'bg-[var(--color-surface-border)]' : 'bg-[var(--color-secondary)]'
              }`}
              aria-label={isSfxMuted ? 'Unmute sound effects' : 'Mute sound effects'}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  isSfxMuted ? '' : 'translate-x-5'
                }`}
              />
            </button>
          </div>

          {!isSfxMuted && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--color-muted)] w-12 shrink-0">Effects</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={sfxVolume}
                onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-[var(--color-secondary)] bg-[var(--color-surface-border)]"
              />
              <span className="text-xs text-[var(--color-muted)] w-8 text-right">
                {Math.round(sfxVolume * 100)}%
              </span>
            </div>
          )}

          <div className="h-px bg-[var(--color-surface-border)]" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isMusicMuted ? (
                <VolumeX size={18} className="text-[var(--color-muted)]" />
              ) : (
                <Music4 size={18} className="text-[var(--color-secondary)]" />
              )}
              <span className="text-sm font-medium">Music</span>
            </div>
            <button
              onClick={() => setMusicMuted(!isMusicMuted)}
              className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                isMusicMuted ? 'bg-[var(--color-surface-border)]' : 'bg-[var(--color-secondary)]'
              }`}
              aria-label={isMusicMuted ? 'Unmute music' : 'Mute music'}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  isMusicMuted ? '' : 'translate-x-5'
                }`}
              />
            </button>
          </div>

          {!isMusicMuted && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--color-muted)] w-12 shrink-0">Music</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={musicVolume}
                onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-[var(--color-secondary)] bg-[var(--color-surface-border)]"
              />
              <span className="text-xs text-[var(--color-muted)] w-8 text-right">
                {Math.round(musicVolume * 100)}%
              </span>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold mb-1">
          Theme
        </h2>
        <p className="text-sm text-[var(--color-muted)] mb-5">
          Unlock themes with milestones or seeds. Themes beyond Cardinal are coming soon!
        </p>
        <div className="grid grid-cols-2 gap-3">
          {themes.map((theme) => {
            const isActive = currentTheme?.name === theme.name;
            const themeUnlock = getThemeUnlockByThemeName(theme.name);
            const isComingSoon = Boolean(themeUnlock?.comingSoon);
            const isUnlocked = unlockedThemeNames.has(theme.name);
            const isLocked = !isComingSoon && !isUnlocked;

            return (
              <button
                key={theme.name}
                type="button"
                onClick={() => {
                  if (isComingSoon) return;
                  if (isLocked) {
                    handleLockedThemeClick(theme.name);
                    return;
                  }

                  handleThemeChange(theme);
                }}
                disabled={isComingSoon}
                className={`relative flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                  isActive
                    ? 'border-[var(--color-secondary)] bg-[var(--color-surface)]'
                    : 'border-[var(--color-surface-border)] bg-[var(--color-surface)]'
                } ${
                  isComingSoon
                    ? 'cursor-not-allowed opacity-60'
                    : isLocked
                      ? 'cursor-pointer hover:bg-[var(--color-surface-hover)]'
                      : 'cursor-pointer hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                <div
                  className="h-8 w-8 shrink-0 rounded-full border-2 border-white/20"
                  style={{ backgroundColor: theme.primary }}
                >
                  <div
                    className="h-full w-full rounded-full"
                    style={{
                      background: `linear-gradient(135deg, ${theme.primary} 50%, ${theme.secondary} 50%)`,
                    }}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <span className="block font-[family-name:var(--font-display)] font-medium text-sm">
                    {theme.name}
                  </span>
                  <span className="block text-[0.65rem] leading-tight text-[var(--color-muted)]">
                    {theme.name === finch.name
                      ? 'Always available'
                      : isComingSoon
                        ? 'Coming Soon'
                        : isUnlocked
                          ? `Unlocked at ${themeUnlock?.milestoneValue} birds`
                          : Math.max((themeUnlock?.seedCost ?? 0) - score.seeds, 0) === 0
                            ? `Unlock now or with ${Math.max((themeUnlock?.milestoneValue ?? 0) - score.birdsIdentified, 0)} more birds`
                            : `${Math.max((themeUnlock?.seedCost ?? 0) - score.seeds, 0)} more seeds or ${Math.max((themeUnlock?.milestoneValue ?? 0) - score.birdsIdentified, 0)} more birds`}
                  </span>
                </div>

                {isActive && (
                  <Check size={16} className="absolute top-2 right-2 text-[var(--color-secondary)]" />
                )}

                {!isActive && isComingSoon && (
                  <span className="absolute top-2 right-2 rounded-full bg-[var(--color-surface-border)] px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
                    Soon
                  </span>
                )}

                {!isActive && isLocked && themeUnlock && (
                  <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-border)] px-2 py-0.5 text-[0.6rem] font-semibold text-[var(--color-muted)]">
                    <SeedIcon size={12} color="currentColor" />
                    {themeUnlock.seedCost}
                  </span>
                )}
              </button>
            );
          })}
        </div>

      </section>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold mb-3">
          About
        </h2>
        <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-surface-border)] text-sm flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <p className="font-medium">Real Fake Birds</p>
            <p className="text-[var(--color-muted)]">
              A guessing game for bird people.
            </p>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-[var(--color-muted)] text-xs">
              Ryan R. Campbell © 2023 - {new Date().getFullYear()} | All rights reserved.
            </p>
            <p className="text-[var(--color-muted)] text-xs">
              Theme music created in collaboration with ElevenLabs.
            </p>
          </div>
        </div>
      </section>

      {pendingPurchase && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-sm"
          onClick={() => setPendingPurchaseThemeName(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="theme-unlock-title"
            className="w-full max-w-md rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <p
                id="theme-unlock-title"
                className="font-[family-name:var(--font-display)] text-lg font-semibold"
              >
                Unlock {pendingPurchase.themeName} for {pendingPurchase.seedCost} seeds?
              </p>
              <div className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-border)] px-2 py-1 text-xs font-semibold text-[var(--color-muted)]">
                <SeedIcon size={14} color="currentColor" />
                {score.seeds}
              </div>
            </div>

            <p className="mt-3 text-center text-sm text-[var(--color-muted)]">
              {canAffordPendingPurchase
                ? `You have ${score.seeds} seeds, so you can unlock this theme now. Or keep playing and correctly identify ${pendingBirdsRemaining} more bird${pendingBirdsRemaining === 1 ? '' : 's'} to unlock it naturally.`
                : `You need ${pendingSeedsRemaining} more seed${pendingSeedsRemaining === 1 ? '' : 's'} to buy this theme. Or correctly identify ${pendingBirdsRemaining} more bird${pendingBirdsRemaining === 1 ? '' : 's'} to unlock it naturally!`}
            </p>

            <div className="mt-5 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={handleThemePurchase}
                disabled={!canAffordPendingPurchase}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  canAffordPendingPurchase
                    ? 'cursor-pointer bg-[var(--color-secondary)] text-[var(--color-on-secondary)]'
                    : 'cursor-not-allowed bg-[var(--color-surface-border)] text-[var(--color-muted)]'
                }`}
              >
                Confirm Unlock
              </button>
              <button
                type="button"
                onClick={() => setPendingPurchaseThemeName(null)}
                className="cursor-pointer rounded-lg border border-[var(--color-surface-border)] px-4 py-2 text-sm font-semibold text-[var(--color-muted)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
