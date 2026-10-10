import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { crearClienteSupabaseSesion } from '@/platform/supabase/session';

function destinoSeguro(value: string | null): string { return value?.startsWith('/') && !value.startsWith('//') ? value : '/dashboard'; }

export async function GET(request: NextRequest) {
  const url = new URL(request.url); const destino = destinoSeguro(url.searchParams.get('next'));
  const supabase = await crearClienteSupabaseSesion();
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType }) : { error: new Error('Enlace de acceso incompleto.') };
  return NextResponse.redirect(new URL(result.error ? '/login?access=invalid' : destino, request.url));
}
