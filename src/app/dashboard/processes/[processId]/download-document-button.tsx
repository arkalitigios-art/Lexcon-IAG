'use client';

import { useState } from 'react';

type DownloadDocumentButtonProps = { href: string; filename: string; label?: string };

function filenameFromDisposition(value: string | null, fallback: string): string {
  const encoded = value?.match(/filename\*=UTF-8''([^;]+)/iu)?.[1];
  return encoded ? decodeURIComponent(encoded) : fallback;
}

export function DownloadDocumentButton({ href, filename, label = 'Descargar Word' }: DownloadDocumentButtonProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function download() {
    setBusy(true); setMessage('');
    try {
      const response = await fetch(href, { credentials: 'same-origin' });
      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: 'No fue posible descargar el documento.' })) as { error?: string };
        throw new Error(body.error ?? 'No fue posible descargar el documento.');
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl; link.download = filenameFromDisposition(response.headers.get('content-disposition'), filename);
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(objectUrl);
      setMessage('Documento descargado.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible descargar el documento.');
    } finally { setBusy(false); }
  }

  return <div className="document-download-control"><button type="button" className="secondary-button" disabled={busy} onClick={download}>{busy ? 'Preparando documento…' : label}</button>{message && <small className="form-message" role="status">{message}</small>}</div>;
}
