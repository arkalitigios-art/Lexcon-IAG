import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ARCHIVO = '20261015120000_administracion_instituciones_y_eventos.sql';
const sql = readFileSync(join(__dirname, '../../supabase/migrations', ARCHIVO), 'utf8');
const FIRMA_EVENTO = 'public.registrar_evento_administrativo(uuid, uuid, uuid, text, text, uuid, jsonb)';
const FIRMA_GUARDAR = 'public.guardar_institucion(uuid, uuid, text, text, text, text, text, text, text)';
const escapar = (texto: string): string => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('migración de administración de Instituciones Educativas', () => {
  it('es posterior a la última migración aplicada', () => {
    expect(ARCHIVO > '20261012201458_sincronizar_correo_y_auditar_acceso.sql').toBe(true);
  });

  it('define las dos funciones con la firma acordada', () => {
    expect(sql).toMatch(/create or replace function public\.registrar_evento_administrativo\(\s*p_id_actor uuid,\s*p_id_institucion uuid,\s*p_id_proceso uuid,\s*p_accion text,\s*p_tipo_entidad text,\s*p_id_entidad uuid,\s*p_datos jsonb default '\{\}'::jsonb\s*\)\s*returns void/i);
    expect(sql).toMatch(/create or replace function public\.guardar_institucion\(\s*p_id_actor uuid,\s*p_id uuid,\s*p_nombre text,\s*p_ciudad text,\s*p_departamento text,\s*p_nit text,\s*p_codigo_dane text,\s*p_estado text,\s*p_observacion text\s*\)\s*returns uuid/i);
  });

  it('las funciones son security definer con search_path fijo', () => {
    expect((sql.match(/security definer/gi) ?? []).length).toBe(2);
    expect((sql.match(/set search_path = pg_catalog, public/gi) ?? []).length).toBe(2);
  });

  it('solo service_role puede ejecutarlas', () => {
    for (const firma of [FIRMA_EVENTO, FIRMA_GUARDAR]) {
      expect(sql).toMatch(new RegExp(`revoke all on function ${escapar(firma)} from public, anon, authenticated`, 'i'));
      expect(sql).toMatch(new RegExp(`grant execute on function ${escapar(firma)} to service_role`, 'i'));
    }
    expect(sql).not.toMatch(/grant[^;]*\bto\b[^;]*\b(anon|authenticated|public)\b/i);
  });

  it('solo acepta las acciones administrativas acordadas y exige un Administrador activo', () => {
    for (const accion of ['INSTITUCION_CREADA', 'INSTITUCION_ACTUALIZADA', 'INSTITUCION_SERVICIO_SUSPENDIDO', 'INSTITUCION_SERVICIO_FINALIZADO', 'INSTITUCION_SERVICIO_REACTIVADO']) expect(sql).toContain(`'${accion}'`);
    expect(sql).toMatch(/rol\.codigo = 'ADMINISTRADOR_ARKA'/);
    expect(sql).toMatch(/errcode = '42501'/);
  });

  it('inserta en eventos_auditoria y deja la cadena de hash al disparador existente', () => {
    expect(sql).toMatch(/insert into public\.eventos_auditoria/i);
    expect(sql).not.toMatch(/hash_evento|hash_anterior/i);
  });

  it('guardar_institucion es atómica: IE, periodo de servicio y auditoría en la misma función', () => {
    expect(sql).toMatch(/insert into public\.instituciones_educativas/i);
    expect(sql).toMatch(/update public\.instituciones_educativas/i);
    expect(sql).toMatch(/for update/i);
    // El cierre nunca puede dejar finaliza_en antes de inicia_en (restricción check del periodo).
    expect(sql).toMatch(/update public\.periodos_servicio_ie\s+set finaliza_en = greatest\(v_hoy, inicia_en\)/);
    // Las fechas de los periodos son las de Colombia: current_date seguiría la zona horaria de la base (UTC) y adelantaría un día por la noche.
    expect(sql).toMatch(/v_hoy date := \(now\(\) at time zone 'America\/Bogota'\)::date/);
    expect(sql).not.toMatch(/current_date/);
    expect((sql.match(/insert into public\.periodos_servicio_ie/gi) ?? []).length).toBe(2);
    expect(sql).toMatch(/perform public\.registrar_evento_administrativo\(/i);
    expect(sql).toMatch(/activo = \(p_estado = 'ACTIVO'\)/);
    expect(sql).toMatch(/errcode = 'P0002'/);
    expect(sql).toMatch(/errcode = '22023'/);
  });
});
