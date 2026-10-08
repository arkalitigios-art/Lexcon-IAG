import { NextResponse } from 'next/server';
import { currentUser } from '@/platform/auth/current-user';
import { LocalPrivateStorage, type StoredFile } from '@/platform/storage/local-storage';
import { getInstitutionRegulation, registerInstitutionRegulation } from '@/modules/regulations/institution-regulation';

export async function GET() { const user = await currentUser(); if (!user) return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 }); return NextResponse.json({ regulation: getInstitutionRegulation(user) }); }
export async function POST(request: Request) {
  const user = await currentUser(); if (!user) return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  let stored: StoredFile | null = null; const storage = new LocalPrivateStorage();
  try { const form = await request.formData(); const file = form.get('regulation'); if (!(file instanceof File)) throw new Error('Debes seleccionar el reglamento institucional.'); stored = await storage.save({ name: file.name, mimeType: file.type, bytes: new Uint8Array(await file.arrayBuffer()) }); registerInstitutionRegulation(user, stored); return NextResponse.json({ ok: true }, { status: 201 }); }
  catch (error) { if (stored) await storage.remove(stored.key); return NextResponse.json({ error: error instanceof Error ? error.message : 'No fue posible registrar el reglamento.' }, { status: 400 }); }
}
