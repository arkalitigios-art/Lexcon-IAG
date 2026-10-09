import type { NextRequest } from 'next/server';
import { actualizarSesionSupabase } from '@/platform/supabase/proxy';

export async function proxy(request: NextRequest) {
  return actualizarSesionSupabase(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
