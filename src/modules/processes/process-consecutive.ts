/** Formats the sequence allocated independently to every institution. */
export function formatInstitutionProcessConsecutive(sequence: number | null | undefined, createdAt: string): string {
  const year = Number.isNaN(new Date(createdAt).getTime()) ? new Date().getUTCFullYear() : new Date(createdAt).getUTCFullYear();
  const value = Number.isInteger(sequence) && Number(sequence) > 0 ? String(sequence).padStart(4, '0') : 'PENDIENTE';
  return `${year}-${value}`;
}
