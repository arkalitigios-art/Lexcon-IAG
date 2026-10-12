/** Oculta casi todo el usuario del correo para dejarlo en auditoría sin exponerlo completo. */
export function enmascararCorreo(correo: string): string {
  const [local, dominio] = correo.split('@');
  if (!local || !dominio) return '***';
  return `${local[0]}${'*'.repeat(Math.max(local.length - 1, 3))}@${dominio}`;
}
