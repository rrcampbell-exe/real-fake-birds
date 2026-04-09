import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  hasSupabaseEnv,
} from './env';

describe('supabase env helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reports whether the public supabase env is available', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    expect(hasSupabaseEnv()).toBe(true);

    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    expect(hasSupabaseEnv()).toBe(false);
  });

  it('reads required env values and throws when they are missing', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role');

    expect(getSupabaseUrl()).toBe('https://example.supabase.co');
    expect(getSupabaseAnonKey()).toBe('anon-key');
    expect(getSupabaseServiceRoleKey()).toBe('service-role');

    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    expect(() => getSupabaseUrl()).toThrow('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL');

    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    expect(() => getSupabaseAnonKey()).toThrow('Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');

    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    expect(() => getSupabaseServiceRoleKey()).toThrow('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY');
  });
});
