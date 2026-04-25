'use client';

import { type AnchorHTMLAttributes } from 'react';
import { isNativePlatform } from '@/lib/native/platform';

type ExternalLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

/**
 * Drop-in replacement for `<a target="_blank">` that opens the URL in
 * SFSafariViewController (iOS) or Chrome Custom Tab (Android) when running
 * inside the Capacitor native shell, keeping the user inside the app instead
 * of ejecting them into a full external browser.
 *
 * Falls back to a normal `<a>` tag on web.
 */
export default function ExternalLink({ href, onClick, children, ...rest }: ExternalLinkProps) {
  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isNativePlatform()) {
      e.preventDefault();
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: href });
    }
    onClick?.(e);
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => { void handleClick(e); }}
      {...rest}
    >
      {children}
    </a>
  );
}
