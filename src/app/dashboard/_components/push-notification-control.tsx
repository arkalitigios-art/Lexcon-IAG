'use client';

import { useEffect, useState } from 'react';

function keyBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = `${value}${'='.repeat((4 - value.length % 4) % 4)}`.replaceAll('-', '+').replaceAll('_', '/');
  const decoded = atob(padded); const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) bytes[index] = decoded.charCodeAt(index);
  return bytes;
}

export function PushNotificationControl() {
  const [state, setState] = useState<'LOADING' | 'AVAILABLE' | 'ACTIVE' | 'OTHER_ACCOUNT' | 'UNAVAILABLE' | 'DENIED' | 'ERROR'>('LOADING');
  const [publicKey, setPublicKey] = useState<string | null>(null);
  useEffect(() => { void (async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) { setState('UNAVAILABLE'); return; }
    const response = await fetch('/api/notifications/push-subscription'); if (!response.ok) { setState('UNAVAILABLE'); return; }
    const config = await response.json() as { enabled: boolean; publicKey: string | null; subscribed: boolean }; if (!config.enabled || !config.publicKey) { setState('UNAVAILABLE'); return; }
    const registration = await navigator.serviceWorker.register('/lexcon-push-sw.js', { scope: '/', updateViaCache: 'none' });
    const browserSubscription = await registration.pushManager.getSubscription();
    setPublicKey(config.publicKey); setState(config.subscribed ? 'ACTIVE' : browserSubscription ? 'OTHER_ACCOUNT' : Notification.permission === 'denied' ? 'DENIED' : 'AVAILABLE');
  })().catch(() => setState('ERROR')); }, []);
  async function activate() { if (!publicKey) return; try { const permission = await Notification.requestPermission(); if (permission !== 'granted') { setState('DENIED'); return; } const registration = await navigator.serviceWorker.ready; const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }); const response = await fetch('/api/notifications/push-subscription', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(subscription) }); if (!response.ok) throw new Error(); setState('ACTIVE'); } catch { setState('ERROR'); } }
  if (state === 'LOADING') return null;
  if (state === 'ACTIVE') return <small className="push-status">● Alertas al dispositivo activas</small>;
  if (state === 'OTHER_ACCOUNT') return <small className="push-status">Este dispositivo está registrado para otra cuenta de LEXCON</small>;
  if (state === 'UNAVAILABLE') return <small className="push-status">Alertas al dispositivo pendientes de configuración</small>;
  if (state === 'DENIED') return <small className="push-status">Active las notificaciones de LEXCON desde el navegador</small>;
  return <button type="button" className="push-enable" onClick={activate}>{state === 'ERROR' ? 'Reintentar alertas al dispositivo' : 'Activar alertas al dispositivo'}</button>;
}
