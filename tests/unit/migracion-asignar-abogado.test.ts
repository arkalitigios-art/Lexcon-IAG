import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(join(__dirname, '../../supabase/migrations/20261008203000_asignar_abogado_proceso.sql'), 'utf8');

describe('contrato de asignar_abogado_proceso', () => {
  it('es security definer con search_path fijo', () => {
    expect(sql).toMatch(/security definer/i);
    expect(sql).toMatch(/set search_path = pg_catalog, public/i);
  });

  it('valida un Administrador y un Abogado activos', () => {
    expect(sql).toMatch(/r\.codigo = 'ADMINISTRADOR_ARKA'/);
    expect(sql).toMatch(/r\.codigo = 'ABOGADO_ARKA'/);
    expect((sql.match(/p\.activo/g) ?? []).length).toBe(2);
  });

  it('retira al abogado anterior antes de registrar el nuevo', () => {
    expect(sql).toMatch(/update public\.responsables_proceso set activo = false, retirado_en = now\(\)\s+where id_proceso = p_id_proceso and tipo_responsabilidad = 'ABOGADO' and activo/i);
    expect(sql.indexOf('update public.responsables_proceso')).toBeLessThan(sql.indexOf('insert into public.responsables_proceso'));
  });

  it('audita ABOGADO_ASIGNADO en eventos_auditoria (la aplicación no duplica la auditoría)', () => {
    expect(sql).toMatch(/insert into public\.eventos_auditoria[\s\S]*'ABOGADO_ASIGNADO'/i);
  });

  it('solo service_role puede ejecutarla', () => {
    expect(sql).toMatch(/revoke all on function public\.asignar_abogado_proceso\(uuid, uuid, uuid\) from public, anon, authenticated/i);
    expect(sql).toMatch(/grant execute on function public\.asignar_abogado_proceso\(uuid, uuid, uuid\) to service_role/i);
    expect(sql).not.toMatch(/grant[^;]*\bto\b[^;]*\b(anon|authenticated|public)\b/i);
  });
});
