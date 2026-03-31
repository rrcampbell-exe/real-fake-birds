'use client';

import { Check, Volume2, VolumeX } from 'lucide-react';
import { themes } from '@/lib/themes';
import { setTheme } from '@/lib/utils/theme-handler';
import BirdSvg from '@/components/icons/BirdSvg';
import { finch } from '@/lib/themes';
import { useStoredJson } from '@/hooks/useStoredValue';
import { useSound } from '@/hooks/useSound';

export default function SettingsPage() {
  const currentTheme = useStoredJson('birdTheme', finch);
  const { isMuted, volume, setMuted, setVolume, play } = useSound();

  const handleThemeChange = (theme: typeof finch) => {
    setTheme(theme);
    document.documentElement.setAttribute('data-theme', theme.name);
    play('themeChange');
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-8">
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
          Theme
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {themes.map((theme) => {
            const isActive = currentTheme?.name === theme.name;
            const isFlamingo = theme.name === 'Flamingo';
            return (
              <button
                key={theme.name}
                onClick={() => handleThemeChange(theme)}
                className={`relative flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all
                  ${isActive
                    ? 'border-[var(--color-secondary)] bg-[var(--color-surface)]'
                    : 'border-[var(--color-surface-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]'
                  }`}
              >
                {/* Theme color swatch */}
                <div
                  className="w-8 h-8 rounded-full border-2 border-white/20 shrink-0"
                  style={{ backgroundColor: theme.primary }}
                >
                  <div
                    className="w-full h-full rounded-full"
                    style={{
                      background: `linear-gradient(135deg, ${theme.primary} 50%, ${theme.secondary} 50%)`,
                    }}
                  />
                </div>

                <div className="flex items-center gap-2 min-w-0">
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center ${isFlamingo ? 'scale-[1.1]' : ''}`}>
                    <BirdSvg themeName={theme.name} color={theme.textColor} size="14px" />
                  </div>
                  <span className="font-[family-name:var(--font-display)] font-medium text-sm">
                    {theme.name}
                  </span>
                </div>

                {isActive && (
                  <Check size={16} className="absolute top-2 right-2 text-[var(--color-secondary)]" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold mb-3">
          Sound
        </h2>
        <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-surface-border)] flex flex-col gap-4">
          {/* Mute toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isMuted ? (
                <VolumeX size={18} className="text-[var(--color-muted)]" />
              ) : (
                <Volume2 size={18} className="text-[var(--color-secondary)]" />
              )}
              <span className="text-sm font-medium">Sound Effects</span>
            </div>
            <button
              onClick={() => setMuted(!isMuted)}
              className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                isMuted ? 'bg-[var(--color-surface-border)]' : 'bg-[var(--color-secondary)]'
              }`}
              aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  isMuted ? '' : 'translate-x-5'
                }`}
              />
            </button>
          </div>

          {/* Volume slider */}
          {!isMuted && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--color-muted)] w-12 shrink-0">Volume</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-[var(--color-secondary)] bg-[var(--color-surface-border)]"
              />
              <span className="text-xs text-[var(--color-muted)] w-8 text-right">
                {Math.round(volume * 100)}%
              </span>
            </div>
          )}
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
              Ryan R. Campbell © 2023 - {new Date().getFullYear()}
            </p>
            <p className="text-[var(--color-muted)] text-xs">
              All rights reserved.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
