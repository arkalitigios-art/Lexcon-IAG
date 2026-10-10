import { inicializarPrimerAdministrador } from '../src/modules/access/supabase-user-administration';

async function main(): Promise<void> {
  if (!process.argv.includes('--execute')) throw new Error('La inicialización requiere el indicador --execute.');
  const correo = process.env.LEXCON_BOOTSTRAP_ADMIN_EMAIL?.trim();
  const nombre = process.env.LEXCON_BOOTSTRAP_ADMIN_NAME?.trim();
  if (!correo || !nombre) throw new Error('Define LEXCON_BOOTSTRAP_ADMIN_EMAIL y LEXCON_BOOTSTRAP_ADMIN_NAME solo para esta ejecución.');
  await inicializarPrimerAdministrador({ correo, nombre });
  console.log('Invitación del Administrador inicial enviada.');
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'No fue posible inicializar el Administrador.'); process.exitCode = 1; });
