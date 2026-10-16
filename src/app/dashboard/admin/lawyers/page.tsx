import Link from 'next/link';
import { listarEquipoJuridico } from '@/modules/admin/legal-team/legal-team-service';
import { puertoEquipoJuridico } from '@/modules/admin/legal-team/legal-team-runtime';
import { WorkspaceShell } from '../../_components/workspace-shell';
import { requireWorkspaceUser } from '../../require-workspace-user';

export default async function LawyersPage() {
  const user = await requireWorkspaceUser(['ARKA_ADMIN']);
  const abogados = await listarEquipoJuridico(puertoEquipoJuridico(), user);
  return <WorkspaceShell user={user} activePath="/dashboard/admin/lawyers"><div className="page-stack admin-control admin-module">
    <header className="page-heading app-page-heading"><div><p className="section-kicker">Administración de equipo</p><h1>Equipo jurídico</h1><p>Abogados Lexcon con acceso activo y sus procesos asignados. Para invitar, corregir un correo o desactivar una cuenta use Usuarios y accesos.</p></div></header>
    <section className="attorney-directory"><div className="directory-heading"><div><p className="section-kicker">Equipo jurídico Lexcon</p><h2>Abogados disponibles para asignación</h2></div><Link className="primary-button" href="/dashboard/admin/users?rol=ABOGADO_ARKA">Invitar abogado <span aria-hidden="true">→</span></Link></div>
      {abogados.length ? <div className="attorney-card-grid">{abogados.map((abogado) => <article className="attorney-card" key={abogado.id}><span className="attorney-card-avatar" aria-hidden="true">{abogado.nombre.slice(0, 1)}</span><div><strong>{abogado.nombre}</strong><span className="availability active">Disponible para asignación</span><small>{abogado.correo}</small><small>{abogado.procesosAsignados} {abogado.procesosAsignados === 1 ? 'proceso asignado' : 'procesos asignados'}</small></div><div className="card-actions"><Link href="/dashboard/admin/users">Gestionar cuenta</Link></div></article>)}</div> : <div className="empty-state"><strong>Aún no hay abogados Lexcon activos.</strong><p>Invite al primero desde Usuarios y accesos.</p></div>}
    </section>
  </div></WorkspaceShell>;
}
