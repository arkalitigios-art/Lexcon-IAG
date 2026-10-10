import { appUrl } from '@/platform/app-url';
import { crearClienteSupabaseServidor, supabaseConfigurado } from '@/platform/supabase/server';
import type { CurrentUser } from '@/platform/auth/current-user';

export const rolesAdministrables = ['ADMINISTRADOR_ARKA', 'ABOGADO_ARKA', 'RECTOR_IE', 'APOYO_IE'] as const;
export type RolAdministrable = typeof rolesAdministrables[number];

export interface UsuarioAdministrado {
  id: string;
  nombre: string;
  correo: string;
  rol: RolAdministrable;
  idInstitucion: string | null;
  institucion: string | null;
  activo: boolean;
  creadoEn: string;
}

export interface InstitucionParaAcceso { id: string; nombre: string }

interface FilaPerfil { id_usuario: string; nombre_mostrado: string; correo_electronico: string; activo: boolean; creado_en: string }
interface FilaAsignacion {
  id_usuario: string;
  id_institucion: string | null;
  activa: boolean;
  roles: { codigo: string } | { codigo: string }[] | null;
  instituciones_educativas: { nombre: string } | { nombre: string }[] | null;
}

function exigirSupabase(): void {
  if (!supabaseConfigurado()) throw new Error('Supabase no está configurado para administrar usuarios.');
}

function validarActor(actor: CurrentUser | null): asserts actor is CurrentUser {
  if (!actor || actor.role !== 'ARKA_ADMIN') throw new Error('No tienes autorización para administrar usuarios.');
}

function texto(value: string, label: string, maximum: number): string {
  const clean = value.trim();
  if (!clean || clean.length > maximum) throw new Error(`${label} no es válido.`);
  return clean;
}

function correo(value: string): string {
  const clean = texto(value, 'El correo', 254).toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(clean)) throw new Error('El correo no es válido.');
  return clean;
}

function rol(value: string): RolAdministrable {
  if (!(rolesAdministrables as readonly string[]).includes(value)) throw new Error('Selecciona un rol que pueda acceder a LEXCON.');
  return value as RolAdministrable;
}

function relation<T>(value: T | T[] | null): T | null { return Array.isArray(value) ? value[0] ?? null : value; }

function esInstitucional(codigo: RolAdministrable): boolean { return codigo === 'RECTOR_IE' || codigo === 'APOYO_IE'; }

export async function listarUsuariosAdministrados(actor: CurrentUser | null): Promise<UsuarioAdministrado[]> {
  validarActor(actor); exigirSupabase();
  const supabase = crearClienteSupabaseServidor();
  const [perfilesResultado, asignacionesResultado] = await Promise.all([
    supabase.from('perfiles_usuario').select('id_usuario,nombre_mostrado,correo_electronico,activo,creado_en').order('creado_en', { ascending: false }),
    supabase.from('asignaciones_roles_usuario').select('id_usuario,id_institucion,activa,roles(codigo),instituciones_educativas(nombre)').order('asignado_en', { ascending: false }),
  ]);
  if (perfilesResultado.error) throw new Error('No fue posible consultar los perfiles de LEXCON.');
  if (asignacionesResultado.error) throw new Error('No fue posible consultar los roles de LEXCON.');
  const asignacionPorUsuario = new Map((asignacionesResultado.data as unknown as FilaAsignacion[]).map((asignacion) => [asignacion.id_usuario, asignacion]));
  return (perfilesResultado.data as unknown as FilaPerfil[]).flatMap((perfil) => {
    const asignacion = asignacionPorUsuario.get(perfil.id_usuario);
    const codigo = relation(asignacion?.roles ?? null)?.codigo;
    if (!asignacion || !codigo || !(rolesAdministrables as readonly string[]).includes(codigo)) return [];
    return [{
      id: perfil.id_usuario,
      nombre: perfil.nombre_mostrado,
      correo: perfil.correo_electronico,
      rol: codigo as RolAdministrable,
      idInstitucion: asignacion.id_institucion,
      institucion: relation(asignacion.instituciones_educativas)?.nombre ?? null,
      activo: perfil.activo && asignacion.activa,
      creadoEn: perfil.creado_en,
    }];
  });
}

export async function listarInstitucionesParaAcceso(actor: CurrentUser | null): Promise<InstitucionParaAcceso[]> {
  validarActor(actor); exigirSupabase();
  const { data, error } = await crearClienteSupabaseServidor().from('instituciones_educativas').select('id,nombre').eq('activo', true).order('nombre');
  if (error) throw new Error('No fue posible consultar las Instituciones Educativas.');
  return (data as Array<{ id: string; nombre: string }>).map((institucion) => ({ id: institucion.id, nombre: institucion.nombre }));
}

export async function invitarUsuario(actor: CurrentUser | null, input: { nombre: string; correo: string; codigoRol: string; idInstitucion?: string | null }): Promise<void> {
  validarActor(actor); exigirSupabase();
  const nombre = texto(input.nombre, 'El nombre', 160); const email = correo(input.correo); const codigoRol = rol(input.codigoRol);
  const idInstitucion = input.idInstitucion?.trim() || null;
  if (esInstitucional(codigoRol) !== Boolean(idInstitucion)) throw new Error(esInstitucional(codigoRol) ? 'Selecciona la Institución Educativa de esta persona.' : 'Este rol no debe tener una Institución Educativa asignada.');
  const supabase = crearClienteSupabaseServidor();
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, { data: { nombre_mostrado: nombre }, redirectTo: appUrl('/auth/confirm?next=/auth/update-password') });
  if (error || !data.user) throw new Error(error?.message?.includes('already') ? 'Ya existe una cuenta con este correo.' : 'No fue posible enviar la invitación. Revisa la configuración de correo de Supabase.');
  const { error: registroError } = await supabase.rpc('registrar_acceso_usuario', {
    p_id_usuario: data.user.id, p_nombre: nombre, p_correo: email, p_codigo_rol: codigoRol, p_id_institucion: idInstitucion, p_id_actor: actor.id,
  });
  if (!registroError) return;
  await supabase.auth.admin.deleteUser(data.user.id).catch(() => undefined);
  throw new Error('No fue posible asignar el acceso solicitado. La invitación fue cancelada.');
}

export async function reenviarAcceso(actor: CurrentUser | null, idUsuario: string): Promise<void> {
  validarActor(actor); exigirSupabase();
  const usuarios = await listarUsuariosAdministrados(actor);
  const usuario = usuarios.find((candidate) => candidate.id === idUsuario);
  if (!usuario || !usuario.activo) throw new Error('La cuenta solicitada no está activa.');
  const { error } = await crearClienteSupabaseServidor().auth.resetPasswordForEmail(usuario.correo, { redirectTo: appUrl('/auth/confirm?next=/auth/update-password') });
  if (error) throw new Error('No fue posible enviar el enlace de acceso. Revisa la configuración de correo de Supabase.');
}

export async function cambiarEstadoUsuario(actor: CurrentUser | null, idUsuario: string, activo: boolean): Promise<void> {
  validarActor(actor); exigirSupabase();
  const supabase = crearClienteSupabaseServidor();
  const { error: authError } = await supabase.auth.admin.updateUserById(idUsuario, { ban_duration: activo ? 'none' : '876000h' });
  if (authError) throw new Error('No fue posible actualizar la sesión de esta cuenta.');
  const { error: estadoError } = await supabase.rpc('cambiar_estado_acceso_usuario', { p_id_usuario: idUsuario, p_activo: activo, p_id_actor: actor.id });
  if (!estadoError) return;
  await supabase.auth.admin.updateUserById(idUsuario, { ban_duration: activo ? '876000h' : 'none' });
  throw new Error('No fue posible actualizar el acceso.');
}

export async function inicializarPrimerAdministrador(input: { correo: string; nombre: string }): Promise<void> {
  exigirSupabase();
  const supabase = crearClienteSupabaseServidor();
  const { count, error: countError } = await supabase.from('asignaciones_roles_usuario').select('id,roles!inner(codigo)', { count: 'exact', head: true }).eq('activa', true).eq('roles.codigo', 'ADMINISTRADOR_ARKA');
  if (countError) throw new Error('No fue posible verificar la cuenta inicial.');
  if ((count ?? 0) > 0) throw new Error('Ya existe un Administrador activo; la inicialización no se puede repetir.');
  const nombre = texto(input.nombre, 'El nombre', 160); const email = correo(input.correo);
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, { data: { nombre_mostrado: nombre }, redirectTo: appUrl('/auth/confirm?next=/auth/update-password') });
  if (error || !data.user) throw new Error('No fue posible enviar la invitación inicial. Revisa que SMTP esté configurado.');
  const { error: registroError } = await supabase.rpc('registrar_acceso_usuario', { p_id_usuario: data.user.id, p_nombre: nombre, p_correo: email, p_codigo_rol: 'ADMINISTRADOR_ARKA', p_id_institucion: null, p_id_actor: null });
  if (!registroError) return;
  await supabase.auth.admin.deleteUser(data.user.id).catch(() => undefined);
  throw new Error('No fue posible registrar el Administrador inicial. La invitación fue cancelada.');
}
