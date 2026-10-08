import Link from 'next/link';
import type { ManagedInstitution } from '@/modules/admin/service-administration';

const status: Record<string, string> = { ACTIVE: 'Servicio activo', SUSPENDED_ARREARS: 'Suspendida por mora', ENDED: 'Servicio finalizado' };

export function InstitutionDirectory({ institutions }: { institutions: ManagedInstitution[] }) {
  return <section className="institution-directory"><div className="directory-heading"><div><p className="section-kicker">Directorio institucional</p><h2>Seleccione una Institución Educativa</h2><p>Abra su ficha para consultar servicio, personas habilitadas y expedientes.</p></div><Link className="primary-button" href="/dashboard/admin/institutions/new">Registrar Institución <span aria-hidden="true">→</span></Link></div><div className="institution-card-grid">{institutions.map((institution) => <Link className={`institution-card ${institution.serviceStatus.toLowerCase()}`} href={`/dashboard/admin/institutions/${institution.id}`} key={institution.id}><span className="institution-card-icon" aria-hidden="true">⌂</span><div><strong>{institution.name}</strong><span className="institution-card-status">{status[institution.serviceStatus]}</span><small>{institution.users} usuarios activos · {institution.processes} expedientes</small></div><b aria-hidden="true">→</b></Link>)}</div></section>;
}
