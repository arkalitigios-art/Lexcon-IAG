import type { SupabaseClient } from '@supabase/supabase-js';

export interface ConsultaFalsa {
  tabla: string;
  operaciones: Array<{ metodo: string; argumentos: unknown[] }>;
}

export interface RespuestaFalsa {
  data?: unknown;
  error?: { code?: string; message: string } | null;
  count?: number | null;
}

export type ResponderTabla = (consulta: ConsultaFalsa) => RespuestaFalsa;
export type ResponderRpc = (nombre: string, argumentos: Record<string, unknown>) => RespuestaFalsa;

/**
 * Cliente de Supabase simulado. Cada `from(tabla)` registra las llamadas encadenadas (select, eq, in, order,
 * limit, maybeSingle...) y, al esperarse, responde con `tablas[tabla](consulta)`; sin respuesta configurada
 * devuelve { data: null, error: null, count: null }. `rpc` registra la llamada y responde con `rpc(nombre, argumentos)`.
 */
export function crearSupabaseFalso(opciones: { tablas?: Record<string, ResponderTabla>; rpc?: ResponderRpc } = {}) {
  const consultas: ConsultaFalsa[] = [];
  const llamadasRpc: Array<{ nombre: string; argumentos: Record<string, unknown> }> = [];

  function desde(tabla: string): unknown {
    const consulta: ConsultaFalsa = { tabla, operaciones: [] };
    consultas.push(consulta);
    const cadena: object = new Proxy({}, {
      get(_objetivo, propiedad) {
        if (propiedad === 'then') {
          const respuesta = opciones.tablas?.[tabla]?.(consulta) ?? {};
          const resultado = { data: respuesta.data ?? null, error: respuesta.error ?? null, count: respuesta.count ?? null };
          return (resolver: (valor: unknown) => unknown, rechazar?: (motivo: unknown) => unknown) => Promise.resolve(resultado).then(resolver, rechazar);
        }
        return (...argumentos: unknown[]) => {
          consulta.operaciones.push({ metodo: String(propiedad), argumentos });
          return cadena;
        };
      },
    });
    return cadena;
  }

  const cliente = {
    from: desde,
    async rpc(nombre: string, argumentos: Record<string, unknown> = {}) {
      llamadasRpc.push({ nombre, argumentos });
      const respuesta = opciones.rpc?.(nombre, argumentos) ?? {};
      return { data: respuesta.data ?? null, error: respuesta.error ?? null };
    },
  };

  return { cliente: cliente as unknown as SupabaseClient, consultas, llamadasRpc };
}

/** Argumentos de cada llamada a `metodo` dentro de una consulta (p. ej. todas las `eq`). */
export function operaciones(consulta: ConsultaFalsa, metodo: string): unknown[][] {
  return consulta.operaciones.filter((operacion) => operacion.metodo === metodo).map((operacion) => operacion.argumentos);
}

export function consultasDe(consultas: ConsultaFalsa[], tabla: string): ConsultaFalsa[] {
  return consultas.filter((consulta) => consulta.tabla === tabla);
}
