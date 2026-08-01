"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePublicSettings } from "@/components/public-settings-provider";

const DEFAULT_POSTER_IMAGE_URL =
  "https://img5.pic.in.th/file/secure-sv1/696b7d56-5aa2-4f30-a1f4-4a74c4fe44ef.webp";

export default function HomePoster() {
  const pathname = usePathname();
  const settings = usePublicSettings();

  if (pathname !== "/") {
    return null;
  }

  const enabled = settings.home_poster_enabled === "true";
  if (!enabled) {
    return null;
  }

  const imageUrl = settings.home_poster_image_url?.trim() || DEFAULT_POSTER_IMAGE_URL;
  const linkUrl = settings.home_poster_link_url?.trim() || null;
  const isRemoteImage = imageUrl.startsWith("http");

  const posterContent = (
    <div className="group relative block overflow-hidden rounded-2xl border border-[var(--theme-color)]/30 bg-white shadow-lg shadow-[var(--theme-color)]/10 transition hover:shadow-[var(--theme-color)]/20">
      <Image
        src={imageUrl}
        alt="Poster โฆษณาหน้าแรก"
        width={1600}
        height={900}
        priority
        sizes="(max-width: 1024px) 100vw, 1152px"
        className="h-full w-full object-cover"
        unoptimized={isRemoteImage}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/10 opacity-0 transition group-hover:opacity-100" />
    </div>
  );

  return (
    <div className="border-b border-[var(--theme-color)]/30 bg-transparent">
      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-10">
        {linkUrl && settings.home_poster_image_url?.trim() ? (
          <Link
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fff4ed]"
          >
            {posterContent}
          </Link>
        ) : (
          posterContent
        )}
      </div>
    </div>
  );
}
