import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import { searchParamsFromObject, parseShareCardRequest, getSharePayloadForRequest, getShareTargetForRequest, buildShareImageUrl } from '@/lib/share/request';
import { createShareCardPalette } from '@/lib/share/theme';

type SearchParams = Record<string, string | string[] | undefined>;

function buildOriginFromHeaders(headerStore: Headers): string {
  const forwardedProto = headerStore.get('x-forwarded-proto');
  const forwardedHost = headerStore.get('x-forwarded-host');
  const host = forwardedHost ?? headerStore.get('host') ?? 'localhost:3000';
  const protocol = forwardedProto ?? (host.includes('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');

  return `${protocol}://${host}`;
}

function getSharePageState(searchParams: SearchParams) {
  const normalizedSearchParams = searchParamsFromObject(searchParams);
  return parseShareCardRequest(normalizedSearchParams);
}

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<SearchParams> }
): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const shareRequest = getSharePageState(resolvedSearchParams);

  if (!shareRequest) {
    return {
      title: 'Shared from Real Fake Birds',
      description: 'Some are real. Some are fake. Tell them apart.',
    };
  }

  const headerStore = await headers();
  const origin = buildOriginFromHeaders(headerStore);
  const payload = getSharePayloadForRequest(shareRequest);
  const imageUrl = buildShareImageUrl(origin, {
    type: shareRequest.type,
    params: shareRequest,
  });

  return {
    title: payload.title,
    description: payload.text,
    openGraph: {
      title: payload.title,
      description: payload.text,
      url: `${origin}/share?${searchParamsFromObject(resolvedSearchParams).toString()}`,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: payload.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: payload.title,
      description: payload.text,
      images: [imageUrl],
    },
  };
}

export default async function SharePage(
  { searchParams }: { searchParams: Promise<SearchParams> }
) {
  const resolvedSearchParams = await searchParams;
  const shareRequest = getSharePageState(resolvedSearchParams);

  if (!shareRequest) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 py-12 text-center">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-secondary)]">Share Preview</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">This share card is missing a few feathers.</h1>
        <p className="max-w-xl text-sm leading-6 text-[var(--color-muted)]">
          The link is incomplete, so there is nothing to preview yet. Jump back into the game and create a fresh share card.
        </p>
        <Link
          href="/"
          className="inline-flex items-center rounded-full bg-[var(--color-secondary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-on-secondary)] transition hover:brightness-110"
        >
          Play Real Fake Birds
        </Link>
      </div>
    );
  }

  const headerStore = await headers();
  const origin = buildOriginFromHeaders(headerStore);
  const payload = getSharePayloadForRequest(shareRequest);
  const target = getShareTargetForRequest(shareRequest);
  const imageUrl = buildShareImageUrl(origin, {
    type: shareRequest.type,
    params: shareRequest,
  });
  const palette = createShareCardPalette(shareRequest.themeName);

  return (
    <div
      className="relative isolate mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-6xl flex-col gap-8 overflow-hidden px-4 py-8 md:px-6 md:py-12"
      style={{
        color: palette.text,
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(circle at top right, ${palette.backgroundOrb} 0%, transparent 32%), linear-gradient(135deg, ${palette.background} 0%, ${palette.backgroundAccent} 100%)`,
        }}
      />

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(19rem,24rem)] lg:items-center">
        <div className="overflow-hidden rounded-[2rem] border border-white/15 bg-black/10 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-sm">
          <Image
            src={imageUrl}
            alt={payload.title}
            width={1200}
            height={630}
            className="block h-auto w-full rounded-[1.4rem] border border-white/10"
          />
        </div>

        <div className="rounded-[2rem] border border-white/15 bg-black/10 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-sm">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em]" style={{ color: palette.accentText, opacity: 0.9 }}>
            Shared from Real Fake Birds
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold leading-tight md:text-4xl">
            {payload.title}
          </h1>
          <p className="mt-4 text-sm leading-6 md:text-base" style={{ color: palette.mutedText }}>
            {payload.text}
          </p>

          <div className="mt-6 grid gap-3 rounded-[1.5rem] border border-white/10 bg-white/10 p-4 text-sm leading-6" style={{ color: palette.text }}>
            <p>
              Share cards use the same bird theme colors and typography as the game, so the post stays recognizable whether it opens in a chat thread, on social, or in a browser preview.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={target.href}
              className="inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold transition hover:brightness-105"
              style={{ backgroundColor: palette.accent, color: palette.accentText }}
            >
              {target.label}
            </Link>
            <Link
              href="/"
              className="inline-flex items-center rounded-full border px-5 py-2.5 text-sm font-semibold transition hover:bg-white/10"
              style={{ borderColor: 'rgba(255,255,255,0.18)', color: palette.text }}
            >
              Play Real Fake Birds
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}