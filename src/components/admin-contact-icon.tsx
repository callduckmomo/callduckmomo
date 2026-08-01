'use client';

import { MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { usePublicSettings } from '@/components/public-settings-provider';

export default function AdminContactIcon() {
  const settings = usePublicSettings();
  const contactUrl = settings.admin_contact_url?.trim() || null;

  if (!contactUrl) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      <Link
        href={contactUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex size-12 items-center justify-center rounded-full bg-[var(--theme-color)] text-white shadow-lg transition-all hover:scale-110 hover:bg-[var(--theme-color)] hover:shadow-xl sm:size-14 animate-in fade-in slide-in-from-bottom-4 duration-500"
        aria-label="ติดต่อแอดมิน"
      >
        <MessageCircle className="size-5 sm:size-6" />
        <span className="absolute -right-1 -top-1 flex size-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--theme-color)] opacity-75"></span>
          <span className="relative inline-flex size-3 rounded-full bg-[var(--theme-color)]"></span>
        </span>
      </Link>
      <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#0B0B0B] px-3 py-2 text-xs font-medium text-white shadow-lg pointer-events-none animate-in fade-in slide-in-from-right-4 duration-500">
        ติดต่อแอดมิน
        <span className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-[#0B0B0B]"></span>
      </span>
    </div>
  );
}
