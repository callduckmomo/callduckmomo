"use client";

import Image from "next/image";
import { useState } from "react";
import { usePublicSettings } from "@/components/public-settings-provider";
import { getSiteConfig } from "@/lib/site-config";
import { getSiteId } from "@/lib/site";

const DEFAULT_LOGO =
  "https://img2.pic.in.th/pic/Black-White-Yellow-Bold-Modern-Typographic-Logo-_8_.webp";

export default function LogoImage() {
  const settings = usePublicSettings();
  const { siteName } = getSiteConfig();
  const custom = settings.site_logo_url?.trim();
  const siteId = getSiteId();
  const [failedCustom, setFailedCustom] = useState<string | null>(null);
  const hasUsableCustom = Boolean(custom && custom !== failedCustom);
  
  if (!hasUsableCustom && siteId !== "main") {
    return (
      <div className="flex items-center h-12 sm:h-16 px-2">
        <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-white/90 drop-shadow-md">
          {siteName}
        </span>
      </div>
    );
  }

  if (hasUsableCustom && custom) {
    return (
      <img
        src={custom}
        alt={`${siteName} logo`}
        className="h-12 w-auto sm:h-16 object-contain"
        onError={() => setFailedCustom(custom)}
      />
    );
  }

  return (
    <Image
      src={DEFAULT_LOGO}
      alt={`${siteName} logo`}
      width={256}
      height={64}
      priority
      sizes="(max-width: 640px) 128px, 160px"
      className="h-12 w-auto sm:h-16 object-contain"
      unoptimized
    />
  );
}
