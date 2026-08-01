'use client'

import { getSiteConfig } from "@/lib/site-config";
import { getSiteId } from "@/lib/site";

export function OrganizationJsonLd() {
  const { siteName, siteUrl } = getSiteConfig();
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteName,
    url: siteUrl,
    ...(getSiteId() === 'main' ? { logo: 'https://img2.pic.in.th/pic/Black-White-Yellow-Bold-Modern-Typographic-Logo-_8_.webp' } : {}),
    description: 'ศูนย์รวมบัญชีพรีเมียมแท้ ราคาถูก ปลอดภัย พร้อมรับประกัน ใช้งานได้จริง ทั้ง Netflix, Spotify, YouTube Premium, Disney+ และอีกมากมาย',
    sameAs: ['https://lin.ee/UgJrdRm'],
    areaServed: 'TH',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: 'Thai',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function WebSiteJsonLd() {
  const { siteName, siteUrl } = getSiteConfig();
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: siteUrl,
    inLanguage: 'th',
    description: 'ศูนย์รวมบัญชีพรีเมียมแท้ ราคาถูก ปลอดภัย พร้อมรับประกัน',
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; url: string }[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
