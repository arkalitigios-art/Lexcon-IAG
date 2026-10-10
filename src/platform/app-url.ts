export function appUrl(path = '/'): string {
  const configured = process.env.LEXCON_APP_URL?.trim();
  const base = configured || (process.env.NODE_ENV === 'production' ? null : 'http://localhost:3000');
  if (!base || !/^https?:\/\/[^\s/]+(?:\/[^\s]*)?$/i.test(base)) throw new Error('LEXCON_APP_URL debe ser una URL válida de la aplicación.');
  return new URL(path, base.endsWith('/') ? base : `${base}/`).toString();
}
