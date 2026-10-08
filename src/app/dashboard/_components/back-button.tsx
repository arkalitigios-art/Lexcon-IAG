'use client';

import { useRouter } from 'next/navigation';

export function BackButton() {
  const router = useRouter();
  return <button type="button" className="sidebar-back" onClick={() => {
    if (window.history.length > 1) router.back();
    else router.push('/dashboard/admin');
  }}><span aria-hidden="true">←</span> Atrás</button>;
}
