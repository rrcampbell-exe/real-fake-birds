'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Birdhouse, ArrowLeft } from 'lucide-react';
import { formatBirdName } from '@/lib/utils/format-bird-name';
import type { PublicBirdhousePayload, PublicBirdhouseEntry } from '@/app/api/birdhouse/[username]/route';

type BirdhouseTab = 'real' | 'fake';

interface PageProps {
  params: Promise<{ username: string }>;
}

function BirdCard({ entry, birdType }: { entry: PublicBirdhouseEntry; birdType: 'real' | 'fake' }) {
  const displayName = formatBirdName(entry.birdKey);
  const imageUrl = entry.thumbUrl ?? entry.imageUrl;

  return (
    <div className="flex aspect-[3/4] flex-col overflow-hidden rounded-[1.75rem] border border-[var(--color-surface-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
      <div className="relative flex-1 overflow-hidden bg-[var(--color-surface-hover)]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={displayName}
            className="h-full w-auto max-w-full rounded-xl object-contain"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Birdhouse size={32} className="text-[var(--color-muted)]" />
          </div>
        )}
        {birdType === 'fake' && (
          <div className="absolute top-2 left-2 rounded-full bg-[var(--color-secondary)] px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--color-on-secondary)]">
            Fake
          </div>
        )}
      </div>
      <div className="px-3 py-3">
        <p className="truncate text-sm font-semibold">{displayName}</p>
      </div>
    </div>
  );
}

function EmptyBirdhouse({ tab, username }: { tab: BirdhouseTab; username: string }) {
  return (
    <div className="rounded-[2rem] border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-surface-hover)] text-[var(--color-secondary)]">
        <Birdhouse size={28} />
      </div>
      <h2 className="mt-5 font-[family-name:var(--font-display)] text-xl font-bold">
        No {tab} birds yet
      </h2>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        {username} hasn&apos;t added any {tab} birds to their birdhouse yet.
      </p>
    </div>
  );
}

export default function PublicBirdhousePage({ params }: PageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState<string>('');
  const [tab, setTab] = useState<BirdhouseTab>(() =>
    searchParams.get('tab') === 'fake' ? 'fake' : 'real',
  );
  const [birdhouse, setBirdhouse] = useState<PublicBirdhousePayload | null>(null);
  const [status, setStatus] = useState<'loading' | 'error' | 'private' | 'ready'>('loading');

  useEffect(() => {
    params.then(({ username: slug }) => {
      setUsername(slug);
      setStatus('loading');

      fetch(`/api/birdhouse/${encodeURIComponent(slug)}`)
        .then(async (res) => {
          if (res.status === 403) {
            setStatus('private');
            return;
          }
          if (!res.ok) {
            setStatus('error');
            return;
          }
          const data = (await res.json()) as PublicBirdhousePayload;
          setBirdhouse(data);
          setStatus('ready');
        })
        .catch(() => setStatus('error'));
    }).catch(() => setStatus('error'));
  }, [params]);

  const setTabAndSyncUrl = (nextTab: BirdhouseTab) => {
    if (nextTab === tab) {
      return;
    }

    setTab(nextTab);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('tab', nextTab);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  };

  const entries: PublicBirdhouseEntry[] = birdhouse
    ? (tab === 'real' ? birdhouse.real : birdhouse.fake)
    : [];

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
      {/* Back link */}
      {username && (
        <Link
          href={`/profile/${username}`}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors w-fit"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          {username}&apos;s profile
        </Link>
      )}

      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
          {username ? `${username}'s Birdhouse` : 'Birdhouse'}
        </h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          Birds worth keeping.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2">
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
      </div>

      {/* Content */}
      {status === 'loading' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] animate-pulse rounded-[1.75rem] bg-[var(--color-surface-hover)]"
            />
          ))}
        </div>
      )}

      {status === 'private' && (
        <div className="rounded-[2rem] border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-8 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">Private Profile</h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            This birdhouse is only visible to followers.
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-[2rem] border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-8 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">Not Found</h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            This birdhouse doesn&apos;t exist or couldn&apos;t be loaded.
          </p>
        </div>
      )}

      {status === 'ready' && entries.length === 0 && (
        <EmptyBirdhouse tab={tab} username={username} />
      )}

      {status === 'ready' && entries.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {entries.map((entry) => (
            <BirdCard key={entry.birdKey} entry={entry} birdType={tab} />
          ))}
        </div>
      )}
    </div>
  );
}
