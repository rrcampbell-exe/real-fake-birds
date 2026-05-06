'use client';

import { useEffect, useState } from 'react';
import { BirdhousePreviewSection, type BirdhousePreviewEntry } from '@/components/profile/BirdhousePreviewCard';
import type { PublicBirdhousePayload } from '@/app/api/birdhouse/[username]/route';
import { formatBirdName } from '@/lib/utils/format-bird-name';

function birdhouseKeyToDisplayName(key: string): string {
  const normalized = key.startsWith('fake:') ? key.slice('fake:'.length) : key;

  return formatBirdName(
    normalized
      .split(/[-_]/g)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' '),
  );
}

function toPreviewEntry(
  entry: PublicBirdhousePayload['real'][number] | PublicBirdhousePayload['fake'][number] | undefined,
): BirdhousePreviewEntry | null {
  if (!entry) {
    return null;
  }

  return {
    birdName: birdhouseKeyToDisplayName(entry.birdKey),
    imageUrl: entry.thumbUrl ?? entry.imageUrl ?? null,
  };
}

export default function PublicBirdhousePreviewCard({ username }: { username: string }) {
  const [fetchState, setFetchState] = useState<{
    username: string | null;
    birdhouse: PublicBirdhousePayload | null;
    status: 'loading' | 'ready' | 'error';
  }>({
    username: username || null,
    birdhouse: null,
    status: username ? 'loading' : 'error',
  });

  useEffect(() => {
    if (!username) {
      return;
    }

    const controller = new AbortController();

    fetch(`/api/birdhouse/${encodeURIComponent(username)}`, { signal: controller.signal })
      .then(async (response) => {
        if (controller.signal.aborted) {
          return;
        }

        if (!response.ok) {
          setFetchState({ username, birdhouse: null, status: 'error' });
          return;
        }

        const payload = (await response.json()) as PublicBirdhousePayload;
        if (!controller.signal.aborted) {
          setFetchState({ username, birdhouse: payload, status: 'ready' });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setFetchState({ username, birdhouse: null, status: 'error' });
        }
      });

    return () => {
      controller.abort();
    };
  }, [username]);

  const status = !username
    ? 'error'
    : fetchState.username === username
      ? fetchState.status
      : 'loading';
  const birdhouse = fetchState.username === username ? fetchState.birdhouse : null;

  if (status === 'loading') {
    return (
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Birdhouses</h2>
          <div className="h-7 w-28 rounded-full bg-[var(--color-surface)] animate-pulse" />
        </div>
        <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface-hover)] p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="h-40 rounded-xl bg-[var(--color-surface)] animate-pulse" />
            <div className="h-40 rounded-xl bg-[var(--color-surface)] animate-pulse" />
          </div>
          <div className="mt-3 h-10 rounded-xl bg-[var(--color-surface)] animate-pulse" />
        </div>
      </section>
    );
  }

  const latestReal = toPreviewEntry(birdhouse?.real[birdhouse.real.length - 1]);
  const latestFake = toPreviewEntry(birdhouse?.fake[birdhouse.fake.length - 1]);
  const recentNames = [
    ...(birdhouse?.real ?? []).map((entry) => entry.birdKey),
    ...(birdhouse?.fake ?? []).map((entry) => entry.birdKey),
  ]
    .slice(-3)
    .reverse()
    .map(birdhouseKeyToDisplayName);

  return (
    <BirdhousePreviewSection
      viewHref={`/profile/${username}/birdhouse`}
      realHref={`/profile/${username}/birdhouse?tab=real`}
      fakeHref={`/profile/${username}/birdhouse?tab=fake`}
      latestReal={latestReal}
      latestFake={latestFake}
      recentNames={recentNames}
      emptyMessage={
        status === 'error'
          ? 'Unable to load this birdhouse preview right now.'
          : `${username} has not added any birds to their birdhouse yet.`
      }
    />
  );
}