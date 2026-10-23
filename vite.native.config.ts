import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, '');
  const apiUrl = env.NEXT_PUBLIC_APP_URL?.trim() || 'https://www.realfakebirds.app';

  return {
    root: path.resolve(root, 'native'),
    publicDir: path.resolve(root, 'public'),
    base: './',
    resolve: {
      alias: [
        { find: 'next/link', replacement: path.resolve(root, 'native/next-link.ts') },
        { find: 'next/navigation', replacement: path.resolve(root, 'native/next-runtime.tsx') },
        { find: 'next/image', replacement: path.resolve(root, 'native/next-image.ts') },
        { find: '@', replacement: path.resolve(root, 'src') },
      ],
    },
    define: {
      __RFB_NATIVE_API_BASE_URL__: JSON.stringify(apiUrl),
      'process.env.NODE_ENV': JSON.stringify('production'),
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_URL ?? ''),
      'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''),
      'process.env.NEXT_PUBLIC_POSTHOG_KEY': JSON.stringify(env.NEXT_PUBLIC_POSTHOG_KEY ?? ''),
      'process.env.NEXT_PUBLIC_POSTHOG_HOST': JSON.stringify(env.NEXT_PUBLIC_POSTHOG_HOST ?? ''),
      'process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY': JSON.stringify(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''),
      'process.env.NEXT_PUBLIC_APP_URL': JSON.stringify(apiUrl),
    },
    build: {
      outDir: path.resolve(root, 'out'),
      emptyOutDir: true,
      assetsDir: 'assets',
    },
  };
});
