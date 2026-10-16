import { NextResponse } from 'next/server';
import { rutaNoDisponible } from '@/platform/features-http';
import { currentUser } from '@/platform/auth/current-user';
import { setAccessActive } from '@/modules/admin/access-management';

export async function PATCH(request: Request) {
  const noDisponible = rutaNoDisponible('ACCESOS'); if (noDisponible) return noDisponible; const user = await currentUser();
  if (!user || user.role !== 'ARKA_ADMIN') return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
  try {
    const payload = await request.json() as { membershipId?: string; active?: boolean };
    if (!payload.membershipId || typeof payload.active !== 'boolean') throw new Error('Selecciona un acceso y su nuevo estado.');
    setAccessActive(user, payload.membershipId, payload.active);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No fue posible actualizar el acceso.' }, { status: 400 });
  }
}
