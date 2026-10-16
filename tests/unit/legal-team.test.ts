import { describe, expect, it, vi } from 'vitest';
import { crearPuertoEquipoJuridicoSupabase } from '../../src/modules/admin/legal-team/legal-team-port-supabase';
import { listarEquipoJuridico, type PuertoEquipoJuridico } from '../../src/modules/admin/legal-team/legal-team-service';
import type { CurrentUser } from '../../src/platform/auth/current-user';
import { consultasDe, crearSupabaseFalso, operaciones } from './helpers/supabase-falso';

const ADMIN: CurrentUser = { id: 'a-1', name: 'Ana', role: 'ARKA_ADMIN', institutionId: null, institutionName: null };
const RECTOR: CurrentUser = { id: 'r-1', name: 'Rosa', role: 'IE_RECTOR', institutionId: 'ie-1', institutionName: 'IE Uno' };

describe('servicio de Equipo jurídico', () => {
  it('solo el Administrador lo consulta y se ordena por nombre', async () => {
    const puerto = {
      listarAbogadosActivos: vi.fn(async () => [
        { id: 'u-2', nombre: 'Zoila', correo: 'z@correo.com', procesosAsignados: 0 },
        { id: 'u-1', nombre: 'Álvaro', correo: 'a@correo.com', procesosAsignados: 2 },
      ]),
    } satisfies PuertoEquipoJuridico;
    await expect(listarEquipoJuridico(puerto, RECTOR)).rejects.toThrow('No tienes autorización para consultar el equipo jurídico.');
    expect(puerto.listarAbogadosActivos).not.toHaveBeenCalled();
    expect((await listarEquipoJuridico(puerto, ADMIN)).map((abogado) => abogado.nombre)).toEqual(['Álvaro', 'Zoila']);
  });
});

describe('adaptador Supabase de Equipo jurídico', () => {
  it('lista abogados con rol y perfil activos y cuenta sus procesos asignados', async () => {
    const falso = crearSupabaseFalso({
      tablas: {
        asignaciones_roles_usuario: () => ({ data: [{ id_usuario: 'u-1', roles: { codigo: 'ABOGADO_ARKA' } }, { id_usuario: 'u-2', roles: { codigo: 'ABOGADO_ARKA' } }, { id_usuario: 'u-1', roles: { codigo: 'ABOGADO_ARKA' } }] }),
        perfiles_usuario: () => ({ data: [{ id_usuario: 'u-1', nombre_mostrado: 'Laura', correo_electronico: 'laura@correo.com' }] }),
        responsables_proceso: () => ({ data: [{ id_usuario: 'u-1' }, { id_usuario: 'u-1' }] }),
      },
    });
    expect(await crearPuertoEquipoJuridicoSupabase(falso.cliente).listarAbogadosActivos()).toEqual([{ id: 'u-1', nombre: 'Laura', correo: 'laura@correo.com', procesosAsignados: 2 }]);
    const [asignaciones] = consultasDe(falso.consultas, 'asignaciones_roles_usuario');
    expect(operaciones(asignaciones, 'eq')).toEqual([['activa', true], ['roles.codigo', 'ABOGADO_ARKA']]);
    const [perfiles] = consultasDe(falso.consultas, 'perfiles_usuario');
    expect(operaciones(perfiles, 'eq')).toEqual([['activo', true]]);
    expect(operaciones(perfiles, 'in')).toEqual([['id_usuario', ['u-1', 'u-2']]]);
    const [responsables] = consultasDe(falso.consultas, 'responsables_proceso');
    expect(operaciones(responsables, 'eq')).toEqual([['tipo_responsabilidad', 'ABOGADO'], ['activo', true]]);
  });

  it('sin abogados no hace más consultas', async () => {
    const falso = crearSupabaseFalso({ tablas: { asignaciones_roles_usuario: () => ({ data: [] }) } });
    expect(await crearPuertoEquipoJuridicoSupabase(falso.cliente).listarAbogadosActivos()).toEqual([]);
    expect(falso.consultas.map((consulta) => consulta.tabla)).toEqual(['asignaciones_roles_usuario']);
  });

  it('un error de consulta responde con un mensaje genérico', async () => {
    const falso = crearSupabaseFalso({ tablas: { asignaciones_roles_usuario: () => ({ error: { message: 'x' } }) } });
    await expect(crearPuertoEquipoJuridicoSupabase(falso.cliente).listarAbogadosActivos()).rejects.toThrow('No fue posible consultar el equipo jurídico.');
  });
});
