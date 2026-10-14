import { NextResponse } from 'next/server';
import { currentUser } from '@/platform/auth/current-user';

export const dynamic = 'force-dynamic';

const SIN_CACHE = { 'cache-control': 'no-store' };

/**
 * Comprobación periódica de la sesión desde las pantallas abiertas. Al pasar por proxy.ts renueva el acceso de
 * Supabase y actualiza las cookies aunque la persona no navegue, de modo que quien deja la aplicación abierta
 * para vigilar avisos no pierde la sesión por inactividad.
 */
export async function GET() {
  try {
    const usuario = await currentUser();
    if (!usuario) return NextResponse.json({ activa: false }, { status: 401, headers: SIN_CACHE });
    return NextResponse.json({ activa: true }, { headers: SIN_CACHE });
  } catch {
    // Una falla pasajera no debe confundirse con una sesión cerrada.
    return NextResponse.json({ activa: false }, { status: 503, headers: SIN_CACHE });
  }
}
