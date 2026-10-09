import { DEMO_CREDENTIALS } from '../src/platform/auth/demo-credentials';
import { crearClienteSupabaseServidor } from '../src/platform/supabase/server';

type CodigoRol = 'ADMINISTRADOR_ARKA' | 'ABOGADO_ARKA' | 'RECTOR_IE' | 'APOYO_IE';

const cuentasDemostracion = [
  { credencial: DEMO_CREDENTIALS[0], codigoRol: 'ADMINISTRADOR_ARKA' as const },
  { credencial: DEMO_CREDENTIALS[1], codigoRol: 'ABOGADO_ARKA' as const },
  { credencial: DEMO_CREDENTIALS[2], codigoRol: 'RECTOR_IE' as const },
  { credencial: DEMO_CREDENTIALS[3], codigoRol: 'APOYO_IE' as const },
];

function exigir<T>(resultado: { data: T; error: { message: string } | null }, operacion: string): T {
  if (resultado.error) throw new Error(`${operacion}: ${resultado.error.message}`);
  return resultado.data;
}

async function asegurarUsuario(email: string, nombre: string, contrasena: string): Promise<string> {
  const supabase = crearClienteSupabaseServidor();
  const usuarios = exigir(await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }), 'No fue posible consultar usuarios de demostración').users;
  const existente = usuarios.find((usuario) => usuario.email?.toLowerCase() === email.toLowerCase());
  if (existente) {
    exigir(await supabase.auth.admin.updateUserById(existente.id, { password: contrasena, email_confirm: true, user_metadata: { nombre_mostrado: nombre, es_demostracion: true } }), `No fue posible actualizar ${email}`);
    return existente.id;
  }
  return exigir(await supabase.auth.admin.createUser({ email, password: contrasena, email_confirm: true, user_metadata: { nombre_mostrado: nombre, es_demostracion: true } }), `No fue posible crear ${email}`).user.id;
}

async function asegurarInstitucion(nombre: string): Promise<string> {
  const supabase = crearClienteSupabaseServidor();
  const existente = exigir(await supabase.from('instituciones_educativas').select('id').eq('nombre', nombre).limit(1).maybeSingle(), `No fue posible consultar ${nombre}`);
  if (existente) return existente.id as string;
  const institucion = exigir(await supabase.from('instituciones_educativas').insert({ nombre, ciudad: 'Ciudad ficticia', departamento: 'Departamento ficticio', estado_servicio: 'ACTIVO', activo: true }).select('id').single(), `No fue posible crear ${nombre}`);
  return institucion.id as string;
}

async function asegurarAsignacion(idUsuario: string, codigoRol: CodigoRol, idInstitucion: string | null): Promise<void> {
  const supabase = crearClienteSupabaseServidor();
  const rol = exigir(await supabase.from('roles').select('id').eq('codigo', codigoRol).single(), `No existe el rol ${codigoRol}`);
  const existente = exigir(await supabase.from('asignaciones_roles_usuario').select('id').eq('id_usuario', idUsuario).eq('id_rol', rol.id as string).is('id_institucion', idInstitucion).eq('activa', true).maybeSingle(), `No fue posible consultar la asignación ${codigoRol}`);
  if (existente) return;
  exigir(await supabase.from('asignaciones_roles_usuario').insert({ id_usuario: idUsuario, id_rol: rol.id as string, id_institucion: idInstitucion, activa: true }), `No fue posible crear la asignación ${codigoRol}`);
}

export async function sembrarDemostracionSupabase(): Promise<void> {
  if (process.env.LEXCON_ALLOW_DEMO_SEED !== 'true') throw new Error('La semilla ficticia requiere LEXCON_ALLOW_DEMO_SEED=true.');
  const instituciones = new Map<string, string>();
  for (const cuenta of cuentasDemostracion) {
    const { credencial, codigoRol } = cuenta;
    const idUsuario = await asegurarUsuario(credencial.email, credencial.displayName, credencial.password);
    const idInstitucion = credencial.institution
      ? instituciones.get(credencial.institution) ?? await asegurarInstitucion(credencial.institution)
      : null;
    if (credencial.institution && idInstitucion) instituciones.set(credencial.institution, idInstitucion);
    const supabase = crearClienteSupabaseServidor();
    exigir(await supabase.from('perfiles_usuario').upsert({ id_usuario: idUsuario, nombre_mostrado: credencial.displayName, correo_electronico: credencial.email, activo: true }, { onConflict: 'id_usuario' }), `No fue posible registrar el perfil ${credencial.email}`);
    await asegurarAsignacion(idUsuario, codigoRol, idInstitucion);
  }
}

if (process.argv.includes('--execute')) {
  sembrarDemostracionSupabase()
    .then(() => console.log('Semilla ficticia de Supabase completada.'))
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : 'Error de semilla');
      process.exitCode = 1;
    });
}
