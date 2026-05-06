'use client';

import Link from 'next/link';
import { Bird, Birdhouse } from 'lucide-react';
import { useBirdhouse } from '@/hooks/useBirdhouse';
import { useBirdJournal } from '@/hooks/useBirdJournal';
import { formatBirdName } from '@/lib/utils/format-bird-name';

export interface BirdhousePreviewEntry {
  birdName: string | null;
  imageUrl: string | null;
}

interface BirdhousePreviewSectionProps {
  title?: string;
  buttonLabel?: string;
  viewHref: string;
  realHref: string;
  fakeHref: string;
  latestReal: BirdhousePreviewEntry | null;
  latestFake: BirdhousePreviewEntry | null;
  recentNames: string[];
  emptyMessage?: string;
}

export function BirdhousePreviewSection({
  title = 'Birdhouses',
  buttonLabel = 'View Birdhouses',
  viewHref,
  realHref,
  fakeHref,
  latestReal,
  latestFake,
  recentNames,
  emptyMessage = 'No birds placed yet. Start curating your roost.',
}: BirdhousePreviewSectionProps) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
          {title}
        </h2>
        <Link
          href={viewHref}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
        >
          <Birdhouse size={13} aria-hidden="true" />
          {buttonLabel}
        </Link>
      </div>

      <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] p-4">
        <div className="grid grid-cols-2 gap-3">
          <BirdhouseLatestCard label="Latest Real" entry={latestReal} href={realHref} />
          <BirdhouseLatestCard label="Latest Fake" entry={latestFake} href={fakeHref} />
        </div>

        <div className="mt-3 min-h-6">
          <p className="text-[0.65rem] uppercase tracking-[0.12em] text-[var(--color-muted)] font-medium">
            Recently Added
          </p>
          {recentNames.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {recentNames.map((name, index) => (
                <span
                  key={`${name}-${index}`}
                  className="rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs text-[var(--color-text)]"
                >
                  {name}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--color-muted)]">{emptyMessage}</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default function BirdhousePreviewCard() {
  const { birdhouse } = useBirdhouse();
  const { journalByKey } = useBirdJournal();

  const latestRealKey = birdhouse.real[birdhouse.real.length - 1] ?? null;
  const latestFakeKey = birdhouse.fake[birdhouse.fake.length - 1] ?? null;
  const latestReal = latestRealKey ? journalByKey[latestRealKey] ?? null : null;
  const latestFake = latestFakeKey ? journalByKey[latestFakeKey] ?? null : null;

  const recentKeys = [...birdhouse.real, ...birdhouse.fake].slice(-3).reverse();
  const recentNames = recentKeys
    .map((birdKey) => journalByKey[birdKey]?.birdName)
    .filter((birdName): birdName is string => Boolean(birdName))
    .map((birdName) => formatBirdName(birdName));

  return (
    <BirdhousePreviewSection
      viewHref="/birdhouse"
      realHref="/birdhouse?tab=real"
      fakeHref="/birdhouse?tab=fake"
      latestReal={latestReal ? {
        birdName: latestReal.birdName,
        imageUrl: latestReal.metadata.imageThumbUrl ?? latestReal.metadata.imageUrl ?? null,
      } : null}
      latestFake={latestFake ? {
        birdName: latestFake.birdName,
        imageUrl: latestFake.metadata.imageThumbUrl ?? latestFake.metadata.imageUrl ?? null,
      } : null}
      recentNames={recentNames}
    />
  );
}

function BirdhouseLatestCard({
  label,
  entry,
  href,
}: {
  label: string;
  entry: BirdhousePreviewEntry | null;
  href: string;
}) {
  const imageUrl = entry?.imageUrl ?? null;

  return (
    <Link
      href={href}
      className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2.5 transition-colors hover:bg-[var(--color-surface-hover)]"
    >
      <p className="text-[0.65rem] uppercase tracking-[0.12em] text-[var(--color-muted)] font-medium">{label}</p>
      <div className="mt-2 flex flex-col gap-2">
        <div className="relative h-24 w-full overflow-hidden rounded-xl sm:h-28 flex items-center justify-center">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={entry?.birdName ?? label}
              className="h-full w-auto max-w-full rounded-xl object-contain"
              loading="lazy"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[var(--color-muted)]">
              <Bird size={22} aria-hidden="true" />
            </span>
          )}
        </div>
        <p className="text-sm font-medium leading-tight text-[var(--color-text)]">
            {entry?.birdName ? formatBirdName(entry.birdName) : 'None yet'}
        </p>
      </div>
    </Link>
  );
}
