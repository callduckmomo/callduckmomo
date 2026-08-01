'use client'

import { usePathname } from 'next/navigation'
import { Megaphone } from 'lucide-react'
import { usePublicSettings } from '@/components/public-settings-provider'

export default function AnnouncementBar() {
  const pathname = usePathname()
  const settings = usePublicSettings()

  if (pathname !== '/') {
    return null
  }

  const isEnabled = settings.announcement_enabled === 'true'
  const text = settings.announcement_text?.trim() || null

  if (!isEnabled || !text) {
    return null
  }

  return (
    <div className="border-b border-black/5 bg-[var(--theme-color-announcement)]">
      <div className="mx-auto w-full max-w-6xl px-0 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-3.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--theme-color)] text-white shadow-sm">
            <Megaphone className="size-4" />
          </span>
          <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <span className="text-sm font-bold text-[var(--theme-color)] leading-tight">ประกาศ</span>
            <span className="text-sm text-[#0B0B0B] leading-relaxed whitespace-pre-line">{text}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
