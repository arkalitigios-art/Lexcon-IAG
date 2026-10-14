import { describe, expect, it } from 'vitest';
import { leerFragmentoEnlace } from '../../src/platform/auth/fragmento-enlace';

describe('lectura del fragmento de un enlace de correo de Supabase', () => {
  it('extrae los tokens de un enlace de invitación o recuperación', () => {
    const fragmento = '#access_token=aaa.bbb.ccc&expires_at=1&expires_in=3600&refresh_token=rrr&token_type=bearer&type=recovery';
    expect(leerFragmentoEnlace(fragmento)).toEqual({ tipo: 'sesion', accessToken: 'aaa.bbb.ccc', refreshToken: 'rrr' });
  });

  it('acepta el fragmento sin el signo # inicial', () => {
    expect(leerFragmentoEnlace('access_token=a&refresh_token=r')).toEqual({ tipo: 'sesion', accessToken: 'a', refreshToken: 'r' });
  });

  it('informa los errores que Supabase devuelve en el fragmento', () => {
    const resultado = leerFragmentoEnlace('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
    expect(resultado).toEqual({ tipo: 'error', codigo: 'otp_expired' });
  });

  it('trata un fragmento con access_token pero sin refresh_token como enlace inválido', () => {
    expect(leerFragmentoEnlace('#access_token=a&token_type=bearer')).toEqual({ tipo: 'invalido' });
    expect(leerFragmentoEnlace('#refresh_token=r')).toEqual({ tipo: 'invalido' });
    expect(leerFragmentoEnlace('#access_token=&refresh_token=')).toEqual({ tipo: 'invalido' });
  });

  it('no encuentra nada en una dirección sin fragmento o con otros datos', () => {
    expect(leerFragmentoEnlace('')).toEqual({ tipo: 'ninguno' });
    expect(leerFragmentoEnlace('#')).toEqual({ tipo: 'ninguno' });
    expect(leerFragmentoEnlace('#seccion-1')).toEqual({ tipo: 'ninguno' });
  });

  it('el error tiene prioridad sobre cualquier token', () => {
    expect(leerFragmentoEnlace('#error=access_denied&access_token=a&refresh_token=r')).toEqual({ tipo: 'error', codigo: 'access_denied' });
  });
});
