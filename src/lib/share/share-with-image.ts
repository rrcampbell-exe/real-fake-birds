'use client';

import { buildSharePageUrl, toShareSearchParams } from '@/lib/share/request';
import type { ShareImageParams, SharePayload } from '@/types';

export type ShareMethod = 'native-image' | 'native' | 'clipboard' | null;

function buildShareBody(payload: SharePayload, shareUrl: string): string {
  return `${payload.text}\n${shareUrl}`;
}

function resolveShareUrl(imageParams?: ShareImageParams): string {
  if (!imageParams) {
    return window.location.origin;
  }

  return buildSharePageUrl(window.location.origin, imageParams);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

async function shareText(payload: SharePayload, shareUrl: string): Promise<ShareMethod> {
  const body = buildShareBody(payload, shareUrl);

  if (navigator.share) {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: shareUrl,
      });
      return 'native';
    } catch (error) {
      if (isAbortError(error)) {
        return null;
      }
    }
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(body);
    return 'clipboard';
  }

  return null;
}

async function fetchShareImage(imageParams: ShareImageParams): Promise<Blob | null> {
  const url = new URL('/api/share', window.location.origin);
  url.search = toShareSearchParams(imageParams).toString();

  const response = await fetch(url.toString());
  if (!response.ok) {
    return null;
  }

  return response.blob();
}

function canShareFiles(file: File): boolean {
  if (!navigator.share || typeof navigator.canShare !== 'function') {
    return false;
  }

  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export async function sharePayload(payload: SharePayload, imageParams?: ShareImageParams): Promise<ShareMethod> {
  if (typeof window === 'undefined') {
    return null;
  }

  const shareUrl = resolveShareUrl(imageParams);

  if (imageParams) {
    try {
      const imageBlob = await fetchShareImage(imageParams);
      if (imageBlob) {
        const file = new File([imageBlob], `real-fake-birds-${imageParams.type}.png`, { type: 'image/png' });
        if (canShareFiles(file)) {
          try {
            await navigator.share({
              title: payload.title,
              text: payload.text,
              url: shareUrl,
              files: [file],
            });
            return 'native-image';
          } catch (error) {
            if (isAbortError(error)) {
              return null;
            }
          }
        }
      }
    } catch {
      // Fall through to the existing text-only behavior.
    }
  }

  return shareText(payload, shareUrl);
}