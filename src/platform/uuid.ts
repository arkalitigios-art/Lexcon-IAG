const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** true si el valor es un texto con forma de UUID: un identificador distinto haría fallar a PostgREST (22P02). */
export function esUuid(valor: unknown): valor is string {
  return typeof valor === 'string' && UUID.test(valor);
}
