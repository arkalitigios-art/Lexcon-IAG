import { NextResponse } from 'next/server'; import { cookies } from 'next/headers'; import { deleteSession } from '@/platform/auth/session';
export async function POST() { const token = (await cookies()).get('lexcon_session')?.value; if (token) deleteSession(token); const response = NextResponse.json({ ok: true }); response.cookies.delete('lexcon_session'); return response; }
