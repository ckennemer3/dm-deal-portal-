import { updateSession } from '@/lib/supabase/middleware';
import { type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // NOTE: must be a plain string literal — Next.js statically analyzes this at
  // build time and ignores the matcher entirely if it can't parse it (e.g.
  // String.raw tagged templates), which makes the middleware run on every
  // request including /_next/static assets and redirect them to /auth/login.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
