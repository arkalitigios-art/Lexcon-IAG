function valorRequerido(nombre) {
  const valor = process.env[nombre]?.trim();
  if (!valor) throw new Error(`Defina ${nombre} solo para esta ejecución.`);
  return valor;
}

function validarCorreo(correo) {
  if (!/^\S+@\S+\.\S+$/.test(correo)) throw new Error('LEXCON_BOOTSTRAP_ADMIN_EMAIL no es un correo válido.');
}

function urlAplicacion() {
  const base = valorRequerido('LEXCON_APP_URL');
  if (!/^https:\/\/[^\s/]+(?:\/[^\s]*)?$/i.test(base)) throw new Error('LEXCON_APP_URL debe ser una URL HTTPS válida.');
  const retorno = new URL('/auth/confirm', base.endsWith('/') ? base : `${base}/`);
  retorno.searchParams.set('next', '/auth/update-password?modo=activacion');
  retorno.searchParams.set('flujo', 'activacion');
  return retorno.toString();
}

async function solicitar(url, opciones) {
  const respuesta = await fetch(url, opciones);
  const texto = await respuesta.text();
  let cuerpo = null;
  try { cuerpo = texto ? JSON.parse(texto) : null; } catch { /* La respuesta no contiene JSON. */ }
  if (!respuesta.ok) throw new Error(`Supabase rechazó la inicialización (HTTP ${respuesta.status}).`);
  return cuerpo;
}

async function main() {
  if (!process.argv.includes('--execute')) throw new Error('La inicialización requiere el indicador --execute.');

  const url = valorRequerido('LEXCON_SUPABASE_URL').replace(/\/$/, '');
  const claveServicio = valorRequerido('LEXCON_SUPABASE_SERVICE_ROLE_KEY');
  const correo = valorRequerido('LEXCON_BOOTSTRAP_ADMIN_EMAIL').toLowerCase();
  const nombre = valorRequerido('LEXCON_BOOTSTRAP_ADMIN_NAME');
  validarCorreo(correo);

  const cabeceras = {
    apikey: claveServicio,
    Authorization: `Bearer ${claveServicio}`,
    'Content-Type': 'application/json',
  };
  const administradores = await solicitar(
    `${url}/rest/v1/asignaciones_roles_usuario?select=id,roles!inner(codigo)&activa=eq.true&roles.codigo=eq.ADMINISTRADOR_ARKA&limit=1`,
    { headers: cabeceras },
  );
  if (Array.isArray(administradores) && administradores.length > 0) throw new Error('Ya existe un Administrador activo; la inicialización no se puede repetir.');

  const enlaceRedireccion = new URL(`${url}/auth/v1/invite`);
  enlaceRedireccion.searchParams.set('redirect_to', urlAplicacion());
  const invitacion = await solicitar(enlaceRedireccion, {
    method: 'POST', headers: cabeceras, body: JSON.stringify({ email: correo, data: { nombre_mostrado: nombre } }),
  });
  const idUsuario = typeof invitacion?.id === 'string' ? invitacion.id : null;
  if (!idUsuario) throw new Error('Supabase no devolvió la cuenta inicial creada.');

  try {
    await solicitar(`${url}/rest/v1/rpc/registrar_acceso_usuario`, {
      method: 'POST', headers: cabeceras,
      body: JSON.stringify({ p_id_usuario: idUsuario, p_nombre: nombre, p_correo: correo, p_codigo_rol: 'ADMINISTRADOR_ARKA', p_id_institucion: null, p_id_actor: null }),
    });
  } catch (causa) {
    await fetch(`${url}/auth/v1/admin/users/${idUsuario}`, { method: 'DELETE', headers: cabeceras }).catch(() => undefined);
    throw causa;
  }

  console.log('Invitación del Administrador inicial enviada. Abra el correo para crear la contraseña.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'No fue posible inicializar el Administrador.');
  process.exitCode = 1;
});
