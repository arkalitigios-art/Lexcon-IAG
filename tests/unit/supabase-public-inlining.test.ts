import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const fuente = readFileSync(join(__dirname, '../../src/platform/supabase/public.ts'), 'utf8');

describe('configuración pública de Supabase en el navegador', () => {
  // Next.js solo sustituye en el navegador los accesos literales a process.env.NEXT_PUBLIC_*.
  // Un acceso dinámico (process.env[nombre]) funciona en el servidor pero llega vacío al navegador
  // y rompe los enlaces de invitación, activación y recuperación ("Supabase no está configurado para el navegador").
  it('lee las variables con acceso literal para que Next.js las incorpore al código del navegador', () => {
    expect(fuente).not.toMatch(/process\.env\s*\[/);
    expect(fuente).toMatch(/process\.env\.NEXT_PUBLIC_SUPABASE_URL\b/);
    expect(fuente).toMatch(/process\.env\.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY\b/);
  });
});
