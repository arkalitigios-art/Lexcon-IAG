'use client';

import { useEffect } from 'react';

const CADA_MS = 10 * 60 * 1000;

/**
 * Mantiene viva la sesión mientras la ventana está abierta: consulta /api/auth/session cada 10 minutos (solo si la
 * pestaña está visible) y al volver a ella o recuperar la conexión. Solo si el servidor responde 401 (sesión
 * cerrada de verdad) lleva al inicio de sesión; cualquier otra respuesta o falla de red se ignora.
 */
export function KeepSessionAlive() {
  useEffect(() => {
    let vigente = true;

    async function comprobar() {
      if (document.visibilityState !== 'visible') return;
      try {
        const respuesta = await fetch('/api/auth/session', { cache: 'no-store', credentials: 'same-origin' });
        if (vigente && respuesta.status === 401) window.location.assign('/login');
      } catch { /* sin conexión: se reintenta en la siguiente ocasión */ }
    }

    const alVolver = () => { if (document.visibilityState === 'visible') void comprobar(); };
    const temporizador = window.setInterval(() => void comprobar(), CADA_MS);
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('online', alVolver);
    return () => {
      vigente = false;
      window.clearInterval(temporizador);
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('online', alVolver);
    };
  }, []);

  return null;
}
