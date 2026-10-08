import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return { name: 'LEXCON IAG', short_name: 'LEXCON', description: 'Contratación FSE', start_url: '/dashboard', display: 'standalone', background_color: '#fffdf9', theme_color: '#183039', icons: [{ src: '/lexcon-icon.svg', sizes: 'any', type: 'image/svg+xml' }] };
}