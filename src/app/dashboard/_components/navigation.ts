import type { CurrentUser } from '@/platform/auth/current-user';
import { rutaMenuDisponible } from '@/platform/features';

/** `pinned`: la opción queda fija bajo la lista desplazable del menú (siempre a la vista en pantallas de poca altura). */
export type NavigationItem = { href: string; label: string; icon: string; section?: string; pinned?: boolean };

const accountItem: NavigationItem = { href: '/dashboard/account', label: 'Mi cuenta', icon: '◍', section: 'MI ESPACIO', pinned: true };

function baseNavFor(user: CurrentUser): NavigationItem[] {
  if (user.role === 'ARKA_ADMIN') return [
    { href: '/dashboard/admin', label: 'Bandeja de trabajo', icon: '▦', section: 'OPERACIÓN CONTRACTUAL' },
    { href: '/dashboard/admin/processes', label: 'Procesos por IE', icon: '□' },
    { href: '/dashboard/admin/assignments', label: 'Asignar responsable jurídico', icon: '+' },
    { href: '/dashboard/admin/alerts', label: 'Alertas y bloqueos', icon: '!' },
    { href: '/dashboard/admin/institutions', label: 'Instituciones Educativas', icon: '⌂', section: 'ADMINISTRACIÓN LEXCON' },
    { href: '/dashboard/admin/institutions/new', label: 'Registrar Institución Educativa', icon: '+' },
    { href: '/dashboard/admin/lawyers', label: 'Equipo jurídico', icon: '◌' },
    { href: '/dashboard/admin/lawyers/new', label: 'Registrar abogado Lexcon', icon: '+' },
    { href: '/dashboard/admin/users', label: 'Usuarios y accesos', icon: '◉' },
    { href: '/dashboard/admin/audit', label: 'Registro de actuaciones', icon: '≡' },
  ];
  if (user.role === 'ARKA_ATTORNEY') return [{ href: '/dashboard/attorney', label: 'Instituciones asignadas', icon: '▦' }];
  if (user.role === 'IE_COMMITTEE') return [];
  return [{ href: '/dashboard/institution', label: 'Procesos', icon: '▦' }, { href: '/dashboard/institution#opening', label: 'Nuevo proceso', icon: '+' }, { href: '/dashboard/regulations', label: 'Manual de contratación IE', icon: '≡' }];
}

/**
 * Quita las opciones cuya función no está disponible con Supabase (src/platform/features.ts).
 * Si desaparece la opción que abría una sección, su rótulo pasa a la siguiente opción visible de esa sección.
 */
function soloDisponibles(items: NavigationItem[]): NavigationItem[] {
  const visibles: NavigationItem[] = [];
  let seccionPendiente: string | undefined;
  for (const item of items) {
    if (item.section) seccionPendiente = item.section;
    if (!rutaMenuDisponible(item.href)) continue;
    const { href, label, icon, pinned } = item;
    visibles.push({ href, label, icon, ...(seccionPendiente ? { section: seccionPendiente } : {}), ...(pinned ? { pinned } : {}) });
    seccionPendiente = undefined;
  }
  return visibles;
}

export function navFor(user: CurrentUser): NavigationItem[] {
  const base = soloDisponibles(baseNavFor(user));
  return user.role === 'IE_COMMITTEE' ? base : [...base, accountItem];
}
