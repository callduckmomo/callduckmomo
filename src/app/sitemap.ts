import type { MetadataRoute } from 'next'
import { getSiteConfig } from '@/lib/site-config'

export default function sitemap(): MetadataRoute.Sitemap {
  const { siteUrl } = getSiteConfig()
  const baseUrl = siteUrl
  
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/support/check`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/support/report`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.4,
    },
  ]
}
