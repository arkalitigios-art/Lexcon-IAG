import type { SupabaseClient } from '@supabase/supabase-js';
import type { PuertoEquipoJuridico } from './legal-team-service';

const MENSAJE = 'No fue posible consultar el equipo jurídico.';

export function crearPuertoEquipoJuridicoSupabase(supabase: SupabaseClient): PuertoEquipoJuridico {
  return {
    async listarAbogadosActivos() {
      const { data: asignaciones, error } = await supabase.from('asignaciones_roles_usuario')
        .select('id_usuario,roles!inner(codigo)').eq('activa', true).eq('roles.codigo', 'ABOGADO_ARKA');
      if (error) throw new Error(MENSAJE);
      const ids = [...new Set(((asignaciones ?? []) as unknown as Array<{ id_usuario: string }>).map((fila) => fila.id_usuario))];
      if (!ids.length) return [];
      const [perfiles, responsables] = await Promise.all([
        supabase.from('perfiles_usuario').select('id_usuario,nombre_mostrado,correo_electronico').eq('activo', true).in('id_usuario', ids),
        supabase.from('responsables_proceso').select('id_usuario').eq('tipo_responsabilidad', 'ABOGADO').eq('activo', true).in('id_usuario', ids),
      ]);
      if (perfiles.error || responsables.error) throw new Error(MENSAJE);
      const asignados = new Map<string, number>();
      for (const fila of (responsables.data ?? []) as unknown as Array<{ id_usuario: string }>) {
        asignados.set(fila.id_usuario, (asignados.get(fila.id_usuario) ?? 0) + 1);
      }
      return ((perfiles.data ?? []) as unknown as Array<{ id_usuario: string; nombre_mostrado: string; correo_electronico: string }>).map((perfil) => ({
        id: perfil.id_usuario,
        nombre: perfil.nombre_mostrado,
        correo: perfil.correo_electronico,
        procesosAsignados: asignados.get(perfil.id_usuario) ?? 0,
      }));
    },
  };
}
