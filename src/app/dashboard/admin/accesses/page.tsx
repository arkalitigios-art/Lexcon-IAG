import { redirect } from 'next/navigation';
import { requireWorkspaceUser } from '../../require-workspace-user';

/** Pantalla retirada: activar y desactivar cuentas se hace en Usuarios y accesos. */
export default async function AccessesPage() {
  await requireWorkspaceUser(['ARKA_ADMIN']);
  redirect('/dashboard/admin/users');
}
