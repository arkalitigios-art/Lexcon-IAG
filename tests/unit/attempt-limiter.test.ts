import { describe, expect, it } from 'vitest';
import { AttemptLimiter } from '../../src/platform/security/attempt-limiter';

function crear() {
  let ahora = 1_000_000;
  const limitador = new AttemptLimiter({ maxFailures: 5, windowMs: 15 * 60_000, now: () => ahora });
  return { limitador, avanzar: (ms: number) => { ahora += ms; } };
}

describe('limitador de intentos', () => {
  it('no bloquea antes de alcanzar el máximo de fallos', () => {
    const { limitador } = crear();
    for (let i = 0; i < 4; i++) limitador.recordFailure('ip-1');
    expect(limitador.isBlocked('ip-1')).toBe(false);
  });

  it('bloquea al quinto fallo durante la ventana completa', () => {
    const { limitador, avanzar } = crear();
    for (let i = 0; i < 5; i++) limitador.recordFailure('ip-1');
    expect(limitador.isBlocked('ip-1')).toBe(true);
    avanzar(14 * 60_000);
    expect(limitador.isBlocked('ip-1')).toBe(true);
    avanzar(61_000);
    expect(limitador.isBlocked('ip-1')).toBe(false);
  });

  it('cuenta cada clave por separado', () => {
    const { limitador } = crear();
    for (let i = 0; i < 5; i++) limitador.recordFailure('ip-1');
    expect(limitador.isBlocked('ip-2')).toBe(false);
  });

  it('olvida los fallos antiguos fuera de la ventana', () => {
    const { limitador, avanzar } = crear();
    for (let i = 0; i < 4; i++) limitador.recordFailure('ip-1');
    avanzar(16 * 60_000);
    limitador.recordFailure('ip-1');
    expect(limitador.isBlocked('ip-1')).toBe(false);
  });

  it('reset elimina el estado de una clave', () => {
    const { limitador } = crear();
    for (let i = 0; i < 5; i++) limitador.recordFailure('ip-1');
    limitador.reset('ip-1');
    expect(limitador.isBlocked('ip-1')).toBe(false);
  });
});
