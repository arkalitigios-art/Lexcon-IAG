export interface AttemptLimiterOptions {
  maxFailures: number;
  windowMs: number;
  now?: () => number;
}

interface Estado { failures: number[]; blockedUntil: number }

/**
 * Limitador en memoria del proceso. Es suficiente para el despliegue de una sola
 * instancia en Dokploy; con varias instancias cada una llevaría su propio conteo.
 */
export class AttemptLimiter {
  private readonly state = new Map<string, Estado>();

  constructor(private readonly options: AttemptLimiterOptions) {}

  private now(): number { return (this.options.now ?? Date.now)(); }

  isBlocked(key: string): boolean {
    const estado = this.state.get(key);
    return Boolean(estado && estado.blockedUntil > this.now());
  }

  recordFailure(key: string): void {
    const ahora = this.now();
    const estado = this.state.get(key) ?? { failures: [], blockedUntil: 0 };
    estado.failures = estado.failures.filter((momento) => momento > ahora - this.options.windowMs);
    estado.failures.push(ahora);
    if (estado.failures.length >= this.options.maxFailures) {
      estado.blockedUntil = ahora + this.options.windowMs;
      estado.failures = [];
    }
    this.state.set(key, estado);
    if (this.state.size > 5000) this.prune(ahora);
  }

  reset(key: string): void { this.state.delete(key); }

  private prune(ahora: number): void {
    for (const [key, estado] of this.state) {
      const vigentes = estado.failures.some((momento) => momento > ahora - this.options.windowMs);
      if (estado.blockedUntil <= ahora && !vigentes) this.state.delete(key);
    }
  }
}
