import { describe, expect, it } from 'vitest';
import { mapearIdentidadSupabase } from '../../src/platform/auth/supabase-identity';

describe('identidad de sesión Supabase', () => {
  it('traduce el código remoto al rol que utiliza la aplicación', () => {
    expect(mapearIdentidadSupabase({
      id_usuario: '00000000-0000-0000-0000-000000000001',
      nombre_mostrado: 'Rectoría de prueba',
      codigo_rol: 'RECTOR_IE',
      id_institucion: '00000000-0000-0000-0000-000000000002',
      nombre_institucion: 'IE Ficticia Horizonte',
    })).toEqual({
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Rectoría de prueba',
      role: 'IE_RECTOR',
      institutionId: '00000000-0000-0000-0000-000000000002',
      institutionName: 'IE Ficticia Horizonte',
    });
  });

  it('rechaza roles no reconocidos o institucionales sin IE', () => {
    expect(mapearIdentidadSupabase({ id_usuario: '1', nombre_mostrado: 'Cuenta', codigo_rol: 'DESCONOCIDO', id_institucion: null, nombre_institucion: null })).toBeNull();
    expect(mapearIdentidadSupabase({ id_usuario: '1', nombre_mostrado: 'Cuenta', codigo_rol: 'APOYO_IE', id_institucion: null, nombre_institucion: null })).toBeNull();
  });
});
