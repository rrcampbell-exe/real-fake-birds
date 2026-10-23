import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { isNativePlatform } from '@/lib/native/platform';

declare const __RFB_NATIVE_API_BASE_URL__: string | undefined;

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  if (!path.startsWith('/api/')) {
    throw new Error(`Expected an API path, received "${path}".`);
  }

  if (!isNativePlatform()) {
    return init === undefined ? fetch(path) : fetch(path, init);
  }

  if (typeof __RFB_NATIVE_API_BASE_URL__ === 'undefined' || !__RFB_NATIVE_API_BASE_URL__) {
    throw new Error('The native API base URL is not configured.');
  }

  const { data, error } = await getSupabaseBrowserClient().auth.getSession();
  if (error) {
    throw error;
  }

  const headers = new Headers(init?.headers);
  if (data.session?.access_token) {
    headers.set('Authorization', `Bearer ${data.session.access_token}`);
  }

  return fetch(new URL(path, __RFB_NATIVE_API_BASE_URL__).toString(), {
    ...init,
    headers,
    credentials: 'omit',
  });
}
