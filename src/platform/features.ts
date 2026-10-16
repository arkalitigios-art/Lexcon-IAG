import { supabaseConfigurado } from '@/platform/supabase/server';

/** Mensaje uniforme de las pantallas y rutas que todavía dependen de SQLite. */
export const MENSAJE_NO_DISPONIBLE = 'Esta función estará disponible próximamente.';

export type ClaveFuncion =
  | 'INSTITUCIONES'
  | 'EQUIPO_JURIDICO'
  | 'ASIGNACION_JURIDICA'
  | 'ALERTAS_BLOQUEOS'
  | 'REGISTRO_ACTUACIONES'
  | 'REGLAMENTOS'
  | 'COTIZACIONES'
  | 'ESTUDIO_MERCADO'
  | 'COMITE_EVALUACION'
  | 'FLUJO_TRANSICIONES'
  | 'DOCUMENTOS_GENERADOS'
  | 'NOTIFICACIONES_PUSH';

export interface Funcion {
  /** Nombre visible de la función (título de la pantalla «no disponible»). */
  etiqueta: string;
  /** Subproyecto de la migración que la habilita: A (Administración), B (expediente) o C (flujo, avisos y worker). */
  subproyecto: 'A' | 'B' | 'C';
  /** true solo cuando todo lo que la función usa tiene rama Supabase. */
  disponibleConSupabase: boolean;
  /** Archivos page.tsx, relativos a src/. */
  paginas: readonly string[];
  /** Archivos route.ts, relativos a src/. */
  api: readonly string[];
  /** href de las opciones del menú lateral que llevan a la función. */
  menu: readonly string[];
  /** Módulos de src/ que hacen el trabajo. */
  modulos: readonly string[];
}

/**
 * Funciones de LEXCON que nacieron sobre SQLite: es la lista de trabajo de la migración a Supabase.
 * Una función se marca como disponible cuando todo lo que usa tiene rama Supabase;
 * tests/unit/funciones-coherencia.test.ts comprueba que la tabla y el código coincidan.
 */
export const FUNCIONES: Readonly<Record<ClaveFuncion, Funcion>> = {
  INSTITUCIONES: {
    etiqueta: 'Instituciones Educativas',
    subproyecto: 'A',
    disponibleConSupabase: true,
    paginas: ['app/dashboard/admin/institutions/page.tsx', 'app/dashboard/admin/institutions/new/page.tsx', 'app/dashboard/admin/institutions/[institutionId]/page.tsx'],
    api: ['app/api/admin/institutions/route.ts'],
    menu: ['/dashboard/admin/institutions', '/dashboard/admin/institutions/new'],
    modulos: ['modules/admin/institutions/institution-runtime.ts', 'modules/admin/institutions/institution-port-supabase.ts'],
  },
  EQUIPO_JURIDICO: {
    etiqueta: 'Equipo jurídico',
    subproyecto: 'A',
    disponibleConSupabase: true,
    paginas: ['app/dashboard/admin/lawyers/page.tsx', 'app/dashboard/admin/lawyers/new/page.tsx'],
    api: [],
    menu: ['/dashboard/admin/lawyers'],
    modulos: ['modules/admin/legal-team/legal-team-runtime.ts', 'modules/admin/legal-team/legal-team-port-supabase.ts'],
  },
  ASIGNACION_JURIDICA: {
    etiqueta: 'Asignar responsable jurídico',
    subproyecto: 'A',
    disponibleConSupabase: true,
    paginas: ['app/dashboard/admin/assignments/page.tsx'],
    api: ['app/api/admin/attorney-assignments/route.ts'],
    menu: ['/dashboard/admin/assignments'],
    modulos: ['modules/assignments/attorney-assignment.ts', 'modules/processes/process-queries.ts'],
  },
  ALERTAS_BLOQUEOS: {
    etiqueta: 'Alertas y bloqueos',
    subproyecto: 'A',
    disponibleConSupabase: true,
    paginas: ['app/dashboard/admin/alerts/page.tsx'],
    api: [],
    menu: ['/dashboard/admin/alerts'],
    modulos: ['modules/admin/control-center.ts', 'modules/admin/control-center-supabase.ts'],
  },
  REGISTRO_ACTUACIONES: {
    etiqueta: 'Registro de actuaciones',
    subproyecto: 'A',
    disponibleConSupabase: true,
    paginas: ['app/dashboard/admin/audit/page.tsx'],
    api: [],
    menu: ['/dashboard/admin/audit'],
    modulos: ['modules/admin/control-center.ts', 'modules/admin/control-center-supabase.ts'],
  },
  REGLAMENTOS: {
    etiqueta: 'Manual de contratación IE',
    subproyecto: 'B',
    disponibleConSupabase: false,
    paginas: ['app/dashboard/regulations/page.tsx'],
    api: ['app/api/regulations/route.ts'],
    menu: ['/dashboard/regulations'],
    modulos: ['modules/regulations/institution-regulation.ts'],
  },
  COTIZACIONES: {
    etiqueta: 'Gestión de cotizaciones',
    subproyecto: 'B',
    disponibleConSupabase: false,
    paginas: [],
    api: ['app/api/processes/[processId]/quotations/route.ts'],
    menu: [],
    modulos: ['modules/processes/market-quote-management.ts', 'modules/automation/iag-drafts.ts'],
  },
  ESTUDIO_MERCADO: {
    etiqueta: 'Estudio de mercado',
    subproyecto: 'B',
    disponibleConSupabase: false,
    paginas: [],
    api: ['app/api/processes/[processId]/market-study-profile/route.ts', 'app/api/processes/[processId]/market-study-document/route.ts'],
    menu: [],
    modulos: ['modules/processes/market-study-profile.ts', 'modules/automation/market-study-docx.ts'],
  },
  COMITE_EVALUACION: {
    etiqueta: 'Comité evaluador y evaluación',
    subproyecto: 'B',
    disponibleConSupabase: false,
    paginas: [],
    api: ['app/api/processes/[processId]/evaluation-team/route.ts', 'app/api/processes/[processId]/evaluation-act/route.ts'],
    menu: [],
    modulos: ['modules/processes/evaluation-team.ts', 'modules/automation/evaluation-act-docx.ts'],
  },
  FLUJO_TRANSICIONES: {
    etiqueta: 'Actuaciones del flujo contractual',
    subproyecto: 'C',
    disponibleConSupabase: false,
    paginas: [],
    api: ['app/api/processes/[processId]/workflow/route.ts'],
    menu: [],
    modulos: ['modules/processes/workflow.ts'],
  },
  DOCUMENTOS_GENERADOS: {
    etiqueta: 'Documentos generados por IAG',
    subproyecto: 'C',
    disponibleConSupabase: false,
    paginas: [],
    api: ['app/api/processes/[processId]/precontractual-documents/[draftKind]/route.ts', 'app/api/processes/[processId]/generated-document/[kind]/route.ts', 'app/api/processes/[processId]/closure-declaration/route.ts'],
    menu: [],
    modulos: ['modules/automation/iag-drafts.ts', 'modules/automation/precontractual-context.ts', 'modules/automation/selection-and-contractual-docx.ts', 'modules/automation/closure-declaration-docx.ts'],
  },
  NOTIFICACIONES_PUSH: {
    etiqueta: 'Alertas al dispositivo',
    subproyecto: 'C',
    disponibleConSupabase: false,
    paginas: [],
    api: ['app/api/notifications/push-subscription/route.ts'],
    menu: [],
    modulos: ['modules/notifications/process-notifications.ts'],
  },
};

/** Una configuración incompleta lanza: se trata como modo Supabase para no caer nunca en SQLite. */
function modoSupabase(): boolean {
  try {
    return supabaseConfigurado();
  } catch {
    return true;
  }
}

/** En modo local todo está disponible; con Supabase, lo declarado en la tabla. */
export function funcionDisponible(clave: ClaveFuncion): boolean {
  if (!modoSupabase()) return true;
  return FUNCIONES[clave].disponibleConSupabase;
}

/** Función a la que lleva una opción del menú (se ignoran la consulta y el ancla), o null si no figura en la tabla. */
export function claveDeRutaMenu(href: string): ClaveFuncion | null {
  const ruta = href.split(/[?#]/)[0];
  for (const [clave, funcion] of Object.entries(FUNCIONES) as Array<[ClaveFuncion, Funcion]>) {
    if (funcion.menu.includes(ruta)) return clave;
  }
  return null;
}

export function rutaMenuDisponible(href: string): boolean {
  const clave = claveDeRutaMenu(href);
  return clave === null || funcionDisponible(clave);
}
