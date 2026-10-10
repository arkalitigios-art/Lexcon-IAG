const origenInterno = 'https://lexcon.invalid';

export function destinoAutenticacionSeguro(value: string | null, fallback = '/dashboard'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  try {
    const destino = new URL(value, origenInterno);
    return destino.origin === origenInterno ? `${destino.pathname}${destino.search}${destino.hash}` : fallback;
  } catch {
    return fallback;
  }
}
