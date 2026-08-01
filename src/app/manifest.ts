import type { MetadataRoute } from 'next'

import { getSiteConfig } from '@/lib/site-config'

export default function manifest(): MetadataRoute.Manifest {
  const { siteName } = getSiteConfig();
  return {
    name: `${siteName} - ขายแอพพรีเมียมราคาถูก`,
    short_name: siteName,
    description: 'ศูนย์รวมบัญชีพรีเมียมแท้ ราคาถูก ปลอดภัย พร้อมรับประกัน',
    start_url: '/',
    display: 'standalone',
    background_color: 'var(--theme-color-bg-bottom)',
    theme_color: 'var(--theme-color)',
    icons: [
      {
        src: '/logo.webp',
        sizes: '192x192',
        type: 'image/webp',
      },
    ],
  }
}
