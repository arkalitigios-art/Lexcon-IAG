import type { Metadata } from 'next';
import './globals.css';
import './ui.css';

export const metadata: Metadata = { title: 'LEXCON IAG', description: 'Gestión jurídico-operativa privada para contratación FSE' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
