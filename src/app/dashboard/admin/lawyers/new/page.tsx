import { redirect } from 'next/navigation';
import { requireWorkspaceUser } from '../../../require-workspace-user';

/** Pantalla retirada: los abogados se invitan desde Usuarios y accesos con el rol Abogado preseleccionado. */
export default async function NewAttorneyPage() {
  await requireWorkspaceUser(['ARKA_ADMIN']);
  redirect('/dashboard/admin/users?rol=ABOGADO_ARKA');
}
