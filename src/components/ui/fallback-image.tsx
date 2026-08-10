"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState, type SyntheticEvent } from "react";

import { cn } from "@/lib/utils";

type FallbackImageProps = Omit<ImageProps, "src"> & {
  src: string;
  fallbackSrc?: string | null;
};

const blockedLegacyImageHosts = new Set([
  "lzawi1lh5kwfejr4.public.blob.vercel-storage.com",
]);

function isBlockedLegacyImageUrl(value: string): boolean {
  try {
    return blockedLegacyImageHosts.has(new URL(value).hostname);
  } catch {
    return false;
  }
}

/** Render a tenant image, then a source image, without leaving a broken icon. */
export function FallbackImage({
  src,
  fallbackSrc,
  onError,
  className,
  alt,
  ...props
}: FallbackImageProps) {
  const defaultFallback = "/logos/default.svg";
  const resolvedFallback =
    fallbackSrc && fallbackSrc !== src ? fallbackSrc : defaultFallback;
  const initialSrc = isBlockedLegacyImageUrl(src) ? resolvedFallback : src;
  const [currentSrc, setCurrentSrc] = useState(initialSrc);
  const [showPlaceholder, setShowPlaceholder] = useState(false);

  useEffect(() => {
    setCurrentSrc(isBlockedLegacyImageUrl(src) ? resolvedFallback : src);
    setShowPlaceholder(false);
  }, [src, fallbackSrc]);

  const handleError = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    onError?.(event);

    if (currentSrc !== resolvedFallback) {
      setCurrentSrc(resolvedFallback);
      return;
    }

    setShowPlaceholder(true);
  };

  const shouldUnoptimize =
    props.unoptimized === true ||
    currentSrc.startsWith("http:") ||
    currentSrc.startsWith("https:") ||
    currentSrc.startsWith("data:");

  if (showPlaceholder) {
    return (
      <span
        aria-label={alt}
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-[#F4F4F5] text-xs font-semibold text-[#9CA3AF]",
          className
        )}
      >
        {(alt || "?").trim().slice(0, 1).toUpperCase()}
      </span>
    );
  }

  return (
    <Image
      {...props}
      src={currentSrc}
      alt={alt}
      className={className}
      unoptimized={shouldUnoptimize}
      onError={handleError}
    />
  );
}
