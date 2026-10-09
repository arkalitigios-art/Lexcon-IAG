import type { PlatformRole } from '../../modules/access/authorization';

export interface IdentidadSupabase {
  id_usuario: string;
  nombre_mostrado: string;
  codigo_rol: string;
  id_institucion: string | null;
  nombre_institucion: string | null;
}

export interface UsuarioSupabaseActual {
  id: string;
  name: string;
  role: PlatformRole;
  institutionId: string | null;
  institutionName: string | null;
}

const rolesPlataforma: Record<string, PlatformRole> = {
  ADMINISTRADOR_ARKA: 'ARKA_ADMIN',
  ABOGADO_ARKA: 'ARKA_ATTORNEY',
  RECTOR_IE: 'IE_RECTOR',
  APOYO_IE: 'IE_SUPPORT',
  COMITE_EVALUADOR: 'IE_COMMITTEE',
};

export function mapearIdentidadSupabase(identidad: IdentidadSupabase): UsuarioSupabaseActual | null {
  const role = rolesPlataforma[identidad.codigo_rol];
  if (!role) return null;
  if ((role === 'IE_RECTOR' || role === 'IE_SUPPORT' || role === 'IE_COMMITTEE') && !identidad.id_institucion) return null;
  return {
    id: identidad.id_usuario,
    name: identidad.nombre_mostrado,
    role,
    institutionId: identidad.id_institucion,
    institutionName: identidad.nombre_institucion,
  };
}
