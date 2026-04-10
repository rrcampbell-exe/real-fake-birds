import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    restoreMocks: true,
    clearMocks: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/app/**',
        'src/types/**',
        'src/components/icons/**',
        'src/components/nav/**',
        'src/components/rewards/**',
        'src/components/analytics/AnalyticsProvider.tsx',
        'src/components/account/AccountStateProvider.tsx',
        'src/lib/supabase/client.ts',
        'src/lib/supabase/middleware.ts',
        'src/lib/supabase/server.ts',
        'src/lib/sound/types.ts',
        'src/app/api/**',
      ],
    },
  },
});