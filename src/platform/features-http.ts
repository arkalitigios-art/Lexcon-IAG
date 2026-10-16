import { NextResponse } from 'next/server';
import { funcionDisponible, MENSAJE_NO_DISPONIBLE, type ClaveFuncion } from './features';

/**
 * Guarda de las rutas de API que todavía dependen de SQLite: con Supabase responde 501 sin caché;
 * en modo local devuelve null y la ruta continúa. Uso: `const noDisponible = rutaNoDisponible('X'); if (noDisponible) return noDisponible;`
 */
export function rutaNoDisponible(clave: ClaveFuncion): NextResponse | null {
  if (funcionDisponible(clave)) return null;
  return NextResponse.json({ error: MENSAJE_NO_DISPONIBLE }, { status: 501, headers: { 'Cache-Control': 'no-store' } });
}
