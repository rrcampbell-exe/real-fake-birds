import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type AnchorHTMLAttributes,
  type CSSProperties,
  type ImgHTMLAttributes,
  type ReactNode,
} from 'react';

type NativeRouterValue = {
  href: string;
  navigate: (href: string, replace?: boolean) => void;
  back: () => void;
};

const NativeRouterContext = createContext<NativeRouterValue | null>(null);

function subscribeToLocation(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange);
  return () => window.removeEventListener('popstate', onChange);
}

function getLocationSnapshot(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function getServerLocationSnapshot(): string {
  return '/';
}

export function NativeRouterProvider({ children }: { children: ReactNode }) {
  const href = useSyncExternalStore(
    subscribeToLocation,
    getLocationSnapshot,
    getServerLocationSnapshot,
  );

  const navigate = useCallback((nextHref: string, replace = false) => {
    if (replace) {
      window.history.replaceState(null, '', nextHref);
    } else {
      window.history.pushState(null, '', nextHref);
    }
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);
  const back = useCallback(() => window.history.back(), []);

  const value = useMemo<NativeRouterValue>(() => ({
    href,
    navigate,
    back,
  }), [back, href, navigate]);

  return (
    <NativeRouterContext.Provider value={value}>
      {children}
    </NativeRouterContext.Provider>
  );
}

function useNativeRouter(): NativeRouterValue {
  const router = useContext(NativeRouterContext);
  if (!router) {
    throw new Error('Native navigation hooks require NativeRouterProvider.');
  }
  return router;
}

export function usePathname(): string {
  const { href } = useNativeRouter();
  return new URL(href, window.location.origin).pathname;
}

export function useSearchParams(): URLSearchParams {
  const { href } = useNativeRouter();
  return useMemo(
    () => new URLSearchParams(new URL(href, window.location.origin).search),
    [href],
  );
}

export function useParams<T extends Record<string, string> = Record<string, string>>(): T {
  const pathname = usePathname();
  const profile = pathname.match(/^\/profile\/([^/]+)(?:\/|$)/);
  return (profile ? { username: decodeURIComponent(profile[1]) } : {}) as T;
}

export function useRouter() {
  const { back, navigate } = useNativeRouter();
  return useMemo(() => ({
    push: (href: string) => navigate(href),
    replace: (href: string) => navigate(href, true),
    back,
    refresh: () => window.location.reload(),
    prefetch: async () => undefined,
  }), [back, navigate]);
}

type NativeLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  prefetch?: boolean;
  scroll?: boolean;
};

export function Link({ href, onClick, prefetch: _prefetch, scroll: _scroll, ...props }: NativeLinkProps) {
  const router = useNativeRouter();
  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented
          || event.button !== 0
          || event.metaKey
          || event.ctrlKey
          || event.shiftKey
          || event.altKey
          || props.target === '_blank'
          || !href.startsWith('/')
        ) {
          return;
        }
        event.preventDefault();
        router.navigate(href);
      }}
    />
  );
}

type NativeImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  unoptimized?: boolean;
};

export function Image({
  fill,
  priority,
  quality: _quality,
  sizes: _sizes,
  unoptimized: _unoptimized,
  style,
  ...props
}: NativeImageProps) {
  const fillStyle: CSSProperties = fill
    ? { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }
    : {};
  return (
    <img
      {...props}
      loading={priority ? 'eager' : props.loading}
      style={{ ...fillStyle, ...style }}
    />
  );
}
