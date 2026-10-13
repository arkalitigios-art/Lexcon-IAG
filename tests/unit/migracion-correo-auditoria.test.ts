import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(join(__dirname, '../../supabase/migrations/20261012201458_sincronizar_correo_y_auditar_acceso.sql'), 'utf8');

describe('migración de correo y auditoría de acceso', () => {
  it('sincroniza el correo del perfil cuando cambia auth.users.email', () => {
    expect(sql).toMatch(/create or replace function public\.sincronizar_correo_perfil\(\)/i);
    expect(sql).toMatch(/after update of email on auth\.users/i);
    expect(sql).toMatch(/update public\.perfiles_usuario/i);
    // Sin esta condición se reescribirían los correos de todos los perfiles.
    expect(sql).toMatch(/where\s+id_usuario\s*=\s*new\.id/i);
    expect(sql).toMatch(/create trigger sincronizar_correo_perfil/i);
    expect(sql).toMatch(/for each row execute function public\.sincronizar_correo_perfil\(\)/i);
    expect(sql).toMatch(/revoke all on function public\.sincronizar_correo_perfil\(\) from public, anon, authenticated/i);
  });

  it('las funciones son security definer con search_path fijo', () => {
    expect((sql.match(/security definer/gi) ?? []).length).toBeGreaterThanOrEqual(2);
    expect((sql.match(/set search_path = pg_catalog, public/gi) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('solo service_role puede ejecutar la auditoría de accesos', () => {
    expect(sql).toMatch(/revoke all on function public\.registrar_evento_acceso\(uuid, uuid, text, jsonb\) from public, anon, authenticated/i);
    expect(sql).toMatch(/grant execute on function public\.registrar_evento_acceso\(uuid, uuid, text, jsonb\) to service_role/i);
    expect(sql).not.toMatch(/grant[^;]*\bto\b[^;]*\b(anon|authenticated|public)\b/i);
  });

  it('solo acepta acciones de acceso conocidas', () => {
    for (const accion of ['ADMIN_RECOVERED', 'EMAIL_CORRECTED', 'EMAIL_CHANGE_REQUESTED', 'PASSWORD_CHANGED']) expect(sql).toContain(accion);
  });
});
