import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { hasSupabaseEnv, getSupabaseAnonKey, getSupabaseUrl } from './env';

export async function updateSession(request: NextRequest, forwardHeaders?: Headers) {
  const initHeaders = forwardHeaders ?? request.headers;
  let response = NextResponse.next({
    request: { headers: initHeaders },
  });

  if (!hasSupabaseEnv()) {
    return response;
  }

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        // Preserve forwarded headers (e.g. x-nonce) when re-creating the response.
        response = NextResponse.next({ request: { headers: initHeaders } });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}