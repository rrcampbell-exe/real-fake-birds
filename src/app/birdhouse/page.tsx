'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Birdhouse, Compass, Sparkles, X } from 'lucide-react';
import { useBirdhouse } from '@/hooks/useBirdhouse';
import { useBirdJournal } from '@/hooks/useBirdJournal';
import { usePageProgressSync } from '@/hooks/usePageProgressSync';
import { useScreenViewed } from '@/hooks/useScreenViewed';
import { writeBirdhouseLastVisitedAt } from '@/lib/utils/birdhouse';
import { formatBirdName } from '@/lib/utils/format-bird-name';
import BirdhouseToggleButton from '@/components/birdhouse/BirdhouseToggleButton';

type BirdhouseTab = 'real' | 'fake';

function formatLastSeen(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
}

function EmptySlots({ filled, total }: { filled: number; total: number }) {
  const slots = Array.from({ length: Math.max(0, total - filled) }, (_, index) => index + filled + 1);

  return slots.map((slot) => (
    <div
      key={slot}
      className="flex aspect-[3/4] flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-[var(--color-surface-border)] bg-[color-mix(in_srgb,var(--color-surface)_90%,white_10%)] p-5 text-center"
    >
      <Birdhouse size={28} className="text-[var(--color-muted)]" />
      <p className="mt-4 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">Open Slot</p>
      <p className="mt-2 text-sm text-[var(--color-muted)]">Spot a bird worth keeping and add it here.</p>
    </div>
  ));
}

function BirdhouseBackImage({ birdName, imageUrl }: { birdName: string; imageUrl: string }) {
  const displayBirdName = formatBirdName(birdName);

  return (
    <div className="mt-3">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={displayBirdName}
          className="block h-auto w-full"
          loading="lazy"
        />
      </div>
    </div>
  );
}

export default function BirdhousePage() {
  useScreenViewed('birdhouse');
  const { isPageBackgroundRefreshing } = usePageProgressSync();
  const { birdhouse, fakeCap, realCap } = useBirdhouse();
  const { journalByKey } = useBirdJournal();
  const [tab, setTab] = useState<BirdhouseTab>('real');
  const [flippedKeys, setFlippedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    writeBirdhouseLastVisitedAt(new Date().toISOString());
  }, []);

  const entries = useMemo(() => {
    const keys = tab === 'real' ? birdhouse.real : birdhouse.fake;
    return keys
      .map((birdKey) => journalByKey[birdKey])
      .filter((entry) => Boolean(entry));
  }, [birdhouse.fake, birdhouse.real, journalByKey, tab]);

  const activeCap = tab === 'real' ? realCap : fakeCap;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-[var(--color-surface-border)] bg-[radial-gradient(circle_at_82%_35%,color-mix(in_srgb,var(--color-secondary)_16%,transparent),transparent_30%),linear-gradient(145deg,color-mix(in_srgb,var(--color-surface)_78%,#fff_22%),color-mix(in_srgb,var(--color-primary)_62%,black_38%))] p-6 shadow-[var(--shadow-card)]">
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-secondary)]">
              <Birdhouse size={14} />
              My Birdhouse
            </div>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-text)] md:text-4xl">
              Your hand-picked roost of unforgettable birds.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--color-muted)]">
              This is your curated collection. Keep the birds that surprised you, delighted you, or deserve a permanent perch.
            </p>
          </div>
        </div>

        {isPageBackgroundRefreshing ? (
          <div className="relative mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted)]">
            <Compass size={14} className="text-[var(--color-secondary)]" />
            Syncing your Birdhouse...
          </div>
        ) : null}
      </section>

      <section className="flex flex-wrap items-center gap-3">
        {(['real', 'fake'] as const).map((nextTab) => {
          const active = nextTab === tab;
          const count = nextTab === 'real' ? birdhouse.real.length : birdhouse.fake.length;
          const limit = nextTab === 'real' ? realCap : fakeCap;

          return (
            <button
              key={nextTab}
              type="button"
              onClick={() => {
                if (nextTab === tab) {
                  return;
                }
                setFlippedKeys(new Set());
                setTab(nextTab);
              }}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                active
                  ? 'bg-[var(--color-secondary)] text-[var(--color-on-secondary)]'
                  : 'border border-[var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              {nextTab === 'real' ? 'Real Birds' : 'Fake Birds'}
              <span className={`rounded-full px-2 py-0.5 text-[0.7rem] ${active ? 'bg-[var(--color-on-secondary)]/18 text-[var(--color-on-secondary)]' : 'bg-[var(--color-surface-hover)] text-[var(--color-muted)]'}`}>
                {count}/{limit}
              </span>
            </button>
          );
        })}
      </section>

      {entries.length === 0 ? (
        <section className="rounded-[2rem] border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-8 text-center shadow-[var(--shadow-card)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-surface-hover)] text-[var(--color-secondary)]">
            <Sparkles size={28} />
          </div>
          <h2 className="mt-5 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-text)]">
            No {tab} birds in your Birdhouse yet
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Visit your field journal or a round result card and add a bird worth keeping.
          </p>
          <Link
            href="/journal"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-secondary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-secondary)] transition hover:brightness-110"
          >
            <Birdhouse size={16} />
            Browse the Journal
          </Link>
        </section>
      ) : null}

      <section className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry) => {
          const displayBirdName = formatBirdName(entry.birdName);
          const imageUnlocked = entry.isReal || Boolean(entry.metadata.imageRevealed);
          const visibleImageUrl = imageUnlocked
            ? (entry.metadata.imageUrl ?? entry.metadata.imageThumbUrl ?? null)
            : null;
          const hasVisibleImage = visibleImageUrl !== null;
          const isFlipped = flippedKeys.has(entry.birdKey);
          const accuracy = entry.seenCount > 0 ? Math.round((entry.correctCount / entry.seenCount) * 100) : 0;
          const lastSeenLabel = formatLastSeen(entry.lastSeenAt);

          return (
            <motion.article
              layout
              key={entry.birdKey}
              className={`group relative cursor-pointer overflow-hidden rounded-[1.8rem] border border-[var(--color-surface-border)] shadow-[var(--shadow-card)] ${isFlipped ? 'self-stretch bg-[var(--color-surface-hover)]' : 'self-start bg-[var(--color-surface)]'}`}
              transition={{
                layout: {
                  type: 'spring',
                  stiffness: 240,
                  damping: 28,
                  mass: 0.95,
                },
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {!isFlipped ? (
                  <motion.div
                    key="front"
                    layout="position"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    aria-hidden={false}
                    onClick={() => setFlippedKeys((prev) => { const next = new Set(prev); next.add(entry.birdKey); return next; })}
                  >
                    {visibleImageUrl ? (
                      <div className="relative aspect-[3/4] overflow-hidden">
                        <Image
                          src={visibleImageUrl}
                          alt={displayBirdName}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                          className="object-cover object-center transition duration-500 group-hover:scale-[1.03]"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_18%,rgba(8,12,18,0.15)_45%,rgba(8,12,18,0.82)_100%)]" />
                      </div>
                    ) : (
                      <div className="flex aspect-[3/4] flex-col justify-end bg-[linear-gradient(160deg,color-mix(in_srgb,var(--color-secondary)_32%,transparent),color-mix(in_srgb,var(--color-primary)_78%,black_22%))] p-5">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/70">Fictional Favorite</p>
                        <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold leading-tight text-white">
                          {displayBirdName}
                        </h2>
                      </div>
                    )}

                    <div
                      className="absolute right-4 top-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <BirdhouseToggleButton
                        birdKey={entry.birdKey}
                        birdName={entry.birdName}
                        isReal={entry.isReal}
                        iconSize={17}
                        className="bg-[color-mix(in_srgb,var(--color-surface)_88%,white_12%)]/95 backdrop-blur-sm"
                      />
                    </div>

                    <div className={`absolute inset-x-0 bottom-0 p-5 ${hasVisibleImage ? '' : 'static'}`}>
                      <div className={`rounded-[1.35rem] border border-white/10 p-4 ${hasVisibleImage ? 'bg-black/35 backdrop-blur-sm' : 'bg-[var(--color-surface)]'}`}>
                        <p className={`text-[0.68rem] font-semibold uppercase tracking-[0.14em] ${hasVisibleImage ? 'text-white/75' : 'text-[var(--color-muted)]'}`}>
                          {entry.isReal ? 'Real Bird' : 'Fake Bird'}
                        </p>
                        <h2 className={`mt-2 font-[family-name:var(--font-display)] text-2xl font-bold leading-tight ${hasVisibleImage ? 'text-white' : 'text-[var(--color-text)]'}`}>
                          {displayBirdName}
                        </h2>
                        <p className={`mt-2 text-sm leading-6 ${hasVisibleImage ? 'text-white/78' : 'text-[var(--color-muted)]'}`}>
                          {entry.isReal
                            ? (entry.metadata.regionLabel ?? entry.metadata.sciName ?? 'A Birdhouse keeper from your collection.')
                            : 'Tap to view your field notes.'}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="back"
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{
                      opacity: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
                      y: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
                      layout: {
                        type: 'spring',
                        stiffness: 240,
                        damping: 28,
                        mass: 0.95,
                      },
                    }}
                    className="flex h-full flex-col p-5"
                    aria-label={`Field notes for ${displayBirdName}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-secondary)]">
                          {entry.isReal ? 'Real Bird' : 'Fake Bird'}
                        </p>
                        <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold leading-tight text-[var(--color-text)]">
                          {displayBirdName}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setFlippedKeys((prev) => { const next = new Set(prev); next.delete(entry.birdKey); return next; }); }}
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-muted)] transition hover:text-[var(--color-text)]"
                        aria-label="Close details"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {(entry.metadata.sciName || entry.metadata.regionLabel) ? (
                      <p className="mt-1.5 text-xs italic text-[var(--color-muted)]">
                        {[entry.metadata.sciName, entry.metadata.regionLabel].filter(Boolean).join(' · ')}
                      </p>
                    ) : null}

                    {visibleImageUrl ? (
                      <BirdhouseBackImage birdName={entry.birdName} imageUrl={visibleImageUrl} />
                    ) : null}

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-[var(--color-surface)] px-3 py-2.5 text-center">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">Spotted</p>
                        <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-text)]">{entry.seenCount}×</p>
                      </div>
                      <div className="rounded-xl bg-[var(--color-surface)] px-3 py-2.5 text-center">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">Accuracy</p>
                        <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-text)]">{accuracy}%</p>
                      </div>
                    </div>

                    {lastSeenLabel ? (
                      <p className="mt-3 text-xs text-[var(--color-muted)]">Last seen {lastSeenLabel}</p>
                    ) : null}

                    {entry.metadata.summary ? (
                      <p className="mt-3 text-sm leading-5 text-[var(--color-muted)]">{entry.metadata.summary}</p>
                    ) : null}

                    <div
                      className="mt-5 flex items-center justify-between gap-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <BirdhouseToggleButton
                        birdKey={entry.birdKey}
                        birdName={entry.birdName}
                        isReal={entry.isReal}
                        iconSize={16}
                        className="border-[var(--color-surface-border)]"
                      />
                      <Link
                        href={`/journal?bird=${encodeURIComponent(entry.birdKey)}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-secondary)] hover:underline"
                      >
                        Full journal <BookOpen size={12} />
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.article>
          );
        })}

        <EmptySlots filled={entries.length} total={activeCap} />
      </section>
    </div>
  );
}

