'use client';

import { useRouter } from 'next/navigation';

export function LogoutButton({ className = '' }: { className?: string }) {
  const router = useRouter();
  return <button className={`logout-button ${className}`} type="button" onClick={async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }}>Cerrar sesión</button>;
}
