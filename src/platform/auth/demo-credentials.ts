/**
 * These are public credentials for the local fictional demonstration only.
 * They are intentionally shown in the access screen and must never be reused
 * for a real institution, person, or deployment.
 */
export const DEMO_CREDENTIALS = [
  { role: 'Administrador Arka', email: 'admin.arka@demo.invalid', password: 'ArkaAdmin.2026', displayName: 'Administración Arka (ficticia)', institution: null, membership: 'ARKA_ADMIN', detail: 'Seguimiento institucional y asignación jurídica.' },
  { role: 'Abogado Arka', email: 'abogado.arka@demo.invalid', password: 'ArkaAbogada.2026', displayName: 'Abogada Arka (ficticia)', institution: null, membership: 'ARKA_ATTORNEY', detail: 'Expedientes jurídicos que tenga asignados.' },
  { role: 'Rector / ordenador', email: 'rector.horizonte@demo.invalid', password: 'Rectoria.2026', displayName: 'Rectoría Horizonte (ficticia)', institution: 'IE Ficticia Horizonte', membership: 'IE_RECTOR', detail: 'Expedientes, firmas y decisiones de su IE.' },
  { role: 'Funcionario autorizado', email: 'apoyo.rioclaro@demo.invalid', password: 'ApoyoRio.2026', displayName: 'Apoyo Río Claro (ficticio)', institution: 'IE Ficticia Río Claro', membership: 'IE_SUPPORT', detail: 'Carga de información y actuaciones delegadas.' },
  { role: 'Rector / ordenador', email: 'rector.amanecer@demo.invalid', password: 'RectoriaAmanecer.2026', displayName: 'Rectoría Amanecer (ficticia)', institution: 'IE Ficticia Amanecer', membership: 'IE_RECTOR', detail: 'Proceso nuevo de prueba desde la apertura hasta el cierre.' },
] as const;
