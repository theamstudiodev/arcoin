import type {NextRequest} from 'next/server';
import {updateSession} from '@/lib/supabase/proxy';

// Next 16 renamed middleware to proxy. This runs before every page and server action.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Everything except Next's build output and static images.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
