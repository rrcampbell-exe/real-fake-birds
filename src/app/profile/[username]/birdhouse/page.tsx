'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api/client';
import { ArrowLeft, Birdhouse, Sparkles } from 'lucide-react';
import { formatBirdName } from '@/lib/utils/format-bird-name';
import type { PublicBirdhousePayload, PublicBirdhouseEntry } from '@/app/api/birdhouse/[username]/route';

type BirdhouseTab = 'real' | 'fake';

function EmptyBirdhouse({ tab, username }: { tab: BirdhouseTab; username: string }) {
  return (
    <section className="rounded-[2rem] border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-8 text-center shadow-[var(--shadow-card)]">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-surface-hover)] text-[var(--color-secondary)]">
        <Sparkles size={28} />
      </div>
      <h2 className="mt-5 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-text)]">
        No {tab} birds yet
      </h2>
      <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
        {username} hasn&apos;t added any {tab} birds to their birdhouse yet.
      </p>
    </section>
  );
}

function keyToDisplayName(key: string): string {
  return key
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function PublicBirdCard({ entry, birdType }: { entry: PublicBirdhouseEntry; birdType: BirdhouseTab }) {
  const displayBirdName = entry.birdKey.includes(' ')
    ? formatBirdName(entry.birdKey)
    : keyToDisplayName(entry.birdKey);
  const visibleImageUrl = entry.imageUrl ?? entry.thumbUrl;

  return (
    <article className="group relative overflow-hidden rounded-[1.8rem] border border-[var(--color-surface-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
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
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/70">
            {birdType === 'real' ? 'Real Bird' : 'Fake Bird'}
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold leading-tight text-white">
            {displayBirdName}
          </h2>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 p-5">
        <div className="rounded-[1.35rem] border border-white/10 bg-black/35 p-4 backdrop-blur-sm">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/75">
            {birdType === 'real' ? 'Real Bird' : 'Fake Bird'}
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold leading-tight text-white">
            {displayBirdName}
          </h2>
        </div>
      </div>
    </article>
  );
}

export default function PublicBirdhousePage() {
  const params = useParams<{ username?: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const username = typeof params?.username === 'string' ? params.username : '';
  const tab: BirdhouseTab = searchParams.get('tab') === 'fake' ? 'fake' : 'real';
  const [fetchState, setFetchState] = useState<{
    username: string | null;
    birdhouse: PublicBirdhousePayload | null;
    status: 'loading' | 'error' | 'private' | 'ready';
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

    apiFetch(`/api/birdhouse/${encodeURIComponent(username)}`, { signal: controller.signal })
      .then(async (res) => {
        if (controller.signal.aborted) {
          return;
        }
        if (res.status === 403) {
          setFetchState({ username, birdhouse: null, status: 'private' });
          return;
        }
        if (!res.ok) {
          setFetchState({ username, birdhouse: null, status: 'error' });
          return;
        }
        const data = (await res.json()) as PublicBirdhousePayload;
        if (!controller.signal.aborted) {
          setFetchState({ username, birdhouse: data, status: 'ready' });
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

  const setTabAndSyncUrl = (nextTab: BirdhouseTab) => {
    if (nextTab === tab) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('tab', nextTab);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  };

  const entries: PublicBirdhouseEntry[] = birdhouse
    ? (tab === 'real' ? birdhouse.real : birdhouse.fake)
    : [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      {username && (
        <Link
          href={`/profile/${username}`}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors w-fit"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          {username}&apos;s profile
        </Link>
      )}

      <section className="relative overflow-hidden rounded-[2rem] border border-[var(--color-surface-border)] bg-[radial-gradient(circle_at_82%_35%,color-mix(in_srgb,var(--color-secondary)_16%,transparent),transparent_30%),linear-gradient(145deg,color-mix(in_srgb,var(--color-surface)_78%,#fff_22%),color-mix(in_srgb,var(--color-primary)_62%,black_38%))] p-6 shadow-[var(--shadow-card)]">
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-secondary)]">
              <Birdhouse size={14} />
              {username ? `${username}'s Birdhouse` : 'Birdhouse'}
            </div>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-text)] md:text-4xl">
              Birds worth boasting about.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--color-muted)]">
              {username ? `${username}'s curated collection.` : 'A curated collection from a fellow real fake birder.'}
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        {(['real', 'fake'] as const).map((t) => {
          const active = t === tab;
          const count = birdhouse ? (t === 'real' ? birdhouse.real.length : birdhouse.fake.length) : 0;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTabAndSyncUrl(t)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                active
                  ? 'bg-[var(--color-secondary)] text-[var(--color-on-secondary)]'
                  : 'border border-[var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              {t === 'real' ? 'Real Birds' : 'Fake Birds'}
              {status === 'ready' && (
                <span className={`rounded-full px-2 py-0.5 text-[0.7rem] ${active ? 'bg-[var(--color-on-secondary)]/18 text-[var(--color-on-secondary)]' : 'bg-[var(--color-surface-hover)] text-[var(--color-muted)]'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </section>

      {status === 'loading' && (
        <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex aspect-[3/4] animate-pulse flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-[var(--color-surface-border)] bg-[color-mix(in_srgb,var(--color-surface)_90%,white_10%)]"
            />
          ))}
        </div>
      )}

      {status === 'private' && (
        <section className="rounded-[2rem] border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-8 text-center shadow-[var(--shadow-card)]">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">Private Profile</h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            This birdhouse is only visible to followers.
          </p>
        </section>
      )}

      {status === 'error' && (
        <section className="rounded-[2rem] border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-8 text-center shadow-[var(--shadow-card)]">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">Not Found</h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            This birdhouse doesn&apos;t exist or couldn&apos;t be loaded.
          </p>
        </section>
      )}

      {status === 'ready' && entries.length === 0 && (
        <EmptyBirdhouse tab={tab} username={username} />
      )}

      {status === 'ready' && entries.length > 0 && (
        <section className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry) => (
            <PublicBirdCard key={entry.birdKey} entry={entry} birdType={tab} />
          ))}
        </section>
      )}
    </div>
  );
}
