import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './styles/tokens.css';
import './globals.css';
import './ui.css';
import './styles/base.css';
import './styles/primitives.css';
import './styles/shell.css';
import './styles/access.css';
import './styles/inbox.css';
import './styles/surfaces.css';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap' });

export const metadata: Metadata = { title: 'LEXCON IAG', description: 'Gestión jurídico-operativa privada para contratación FSE' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es" className={outfit.variable}><body>{children}</body></html>;
}
