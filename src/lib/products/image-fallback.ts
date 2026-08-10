export type ProductImageIdentity = {
  name?: string | null;
  typeId?: string | null;
  typeMenu?: string | null;
};

/**
 * Local, deterministic image fallbacks for products whose uploaded media is
 * no longer reachable. Keeping these assets in the app avoids another
 * network dependency when a legacy Blob URL fails.
 */
const fallbackRules: Array<{ pattern: RegExp; src: string }> = [
  { pattern: /youtube|ยูทูบ/i, src: "/logos/youtube.svg" },
  { pattern: /youku/i, src: "/logos/youku.svg" },
  { pattern: /bilibili/i, src: "/logos/bilibili.svg" },
  { pattern: /hbo|max/i, src: "/logos/hbo-max.svg" },
  { pattern: /iqiyi|iqiy/i, src: "/logos/iqiyi.svg" },
  { pattern: /mango/i, src: "/logos/mango-tv.svg" },
  { pattern: /monomax/i, src: "/logos/monomax.svg" },
  { pattern: /netflix|(^|\W)nf(\W|$)/i, src: "/logos/netflix.svg" },
  { pattern: /oned|one\s*d/i, src: "/logos/oned.svg" },
  { pattern: /prime/i, src: "/logos/prime-video.svg" },
  { pattern: /true\s*id|trueid/i, src: "/logos/true-id.svg" },
  { pattern: /viu/i, src: "/logos/viu.svg" },
  { pattern: /wetv|we\s*tv/i, src: "/logos/wetv.svg" },
  { pattern: /canva/i, src: "/logos/canva.svg" },
  { pattern: /chatgpt/i, src: "/logos/chatgpt.svg" },
  { pattern: /meitu/i, src: "/logos/meitu.svg" },
  { pattern: /spotify/i, src: "/logos/spotify.svg" },
];

export function getProductImageFallbackUrl(identity: ProductImageIdentity): string {
  const haystack = [identity.name, identity.typeId, identity.typeMenu]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" ");

  return fallbackRules.find((rule) => rule.pattern.test(haystack))?.src ?? "/logos/default.svg";
}
