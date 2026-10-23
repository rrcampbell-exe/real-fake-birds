import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from './next-runtime';
import { getSupabaseBrowserClient } from '../src/lib/supabase/client';

function parseEmailOtpType(value: string | null) {
  switch (value) {
    case 'signup':
    case 'invite':
    case 'magiclink':
    case 'recovery':
    case 'email_change':
    case 'email':
      return value;
    default:
      return null;
  }
}

export function nativeCallbackPath(urlString: string): string | null {
  const url = new URL(urlString);
  if (url.protocol !== 'realfakebirds:') {
    return null;
  }

  const path = url.hostname === 'auth'
    ? `/auth${url.pathname === '/callback' ? '/callback' : url.pathname}`
    : `/${url.hostname}${url.pathname}`;
  return `${path}${url.search}${url.hash}`;
}

function isSafeNextPath(value: string | null): value is string {
  return Boolean(value && value.startsWith('/') && !value.startsWith('//'));
}

export default function NativeAuthCallbackHandler() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.toString();

  useEffect(() => {
    let active = true;
    let removeListener: (() => void) | undefined;

    const navigateFromAppUrl = (url: string) => {
      const path = nativeCallbackPath(url);
      if (path) {
        router.replace(path);
      }
    };

    void (async () => {
      const { App } = await import('@capacitor/app');
      const listener = await App.addListener('appUrlOpen', ({ url }) => {
        navigateFromAppUrl(url);
      });

      if (!active) {
        await listener.remove();
        return;
      }

      removeListener = () => { void listener.remove(); };
      const launch = await App.getLaunchUrl();
      if (launch?.url) {
        navigateFromAppUrl(launch.url);
      }
    })();

    return () => {
      active = false;
      removeListener?.();
    };
  }, [router]);

  useEffect(() => {
    if (pathname !== '/auth/callback') {
      return;
    }

    let active = true;
    const params = new URLSearchParams(query);
    const nextPath = params.get('type') === 'recovery'
      ? '/auth/reset-password'
      : params.get('next');

    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const code = params.get('code');
        const tokenHash = params.get('token_hash');
        const type = parseEmailOtpType(params.get('type'));

        const result = code
          ? await supabase.auth.exchangeCodeForSession(code)
          : tokenHash && type
            ? await supabase.auth.verifyOtp({
                token_hash: tokenHash,
                type,
              })
            : { error: new Error('missing_auth_callback_token') };

        if (result.error) {
          throw result.error;
        }

        if (active) {
          router.replace(isSafeNextPath(nextPath) ? nextPath : '/settings');
        }
      } catch {
        if (active) {
          router.replace('/settings?authError=exchange_failed');
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [pathname, query, router]);

  return null;
}
