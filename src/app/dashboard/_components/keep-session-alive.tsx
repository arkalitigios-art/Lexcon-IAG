'use client';

import { useEffect } from 'react';
import { evaluarRespuestaSesion } from '@/platform/auth/sesion-cambiada';

const CADA_MS = 10 * 60 * 1000;

/**
 * Mantiene viva la sesión mientras la ventana está abierta y vigila que siga siendo la de esta pantalla: consulta
 * /api/auth/session cada 10 minutos (solo si la pestaña está visible), al volver a la pestaña, al enfocar la ventana y
 * al recuperar la conexión. Si el servidor responde 401 (sesión cerrada de verdad) lleva al inicio de sesión; si otra
 * persona inició sesión en este navegador, avisa y recarga con esa sesión para no actuar con una identidad distinta de
 * la que se ve. Cualquier otra respuesta o falla de red se ignora.
 */
export function KeepSessionAlive({ idUsuario }: { idUsuario: string }) {
  useEffect(() => {
    let vigente = true;
    let avisado = false;

    async function comprobar() {
      if (document.visibilityState !== 'visible') return;
      try {
        const respuesta = await fetch('/api/auth/session', { cache: 'no-store', credentials: 'same-origin' });
        const cuerpo = await respuesta.json().catch(() => null) as { activa?: boolean; id?: string } | null;
        if (!vigente) return;
        const resultado = evaluarRespuestaSesion(idUsuario, respuesta.status, cuerpo);
        if (resultado === 'sesion-cerrada') window.location.assign('/login');
        if (resultado === 'sesion-cambiada' && !avisado) {
          avisado = true;
          window.alert('Se inició otra sesión en este navegador. Esta pantalla se actualizará con esa sesión.');
          window.location.assign('/dashboard');
        }
      } catch { /* sin conexión: se reintenta en la siguiente ocasión */ }
    }

    const alVolver = () => { void comprobar(); };
    const temporizador = window.setInterval(() => void comprobar(), CADA_MS);
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('focus', alVolver);
    window.addEventListener('online', alVolver);
    return () => {
      vigente = false;
      window.clearInterval(temporizador);
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('focus', alVolver);
      window.removeEventListener('online', alVolver);
    };
  }, [idUsuario]);

  return null;
}
