import { createHash } from "node:crypto";

/**
 * Public image settings are stored as data URLs for backwards compatibility.
 * Never embed those large values in the root layout or page RSC payloads.
 * Convert them to a small, cacheable image endpoint instead.
 */
export const PUBLIC_MEDIA_SETTING_KEYS = [
  "site_logo_url",
  "home_poster_image_url",
  "home_movie_poster_1",
  "home_movie_poster_2",
  "home_movie_poster_3",
  "home_movie_poster_4",
  "home_movie_poster_5",
  "home_movie_poster_6",
  "home_shortcut_image_1",
  "home_shortcut_image_2",
  "home_shortcut_image_3",
  "home_shortcut_image_4",
] as const;

const PUBLIC_MEDIA_KEY_SET = new Set<string>(PUBLIC_MEDIA_SETTING_KEYS);

export function toPublicMediaUrl(
  key: string,
  value: string | null | undefined
): string | null {
  if (!value) return value ?? null;

  const trimmed = value.trim();
  if (!trimmed || !PUBLIC_MEDIA_KEY_SET.has(key) || !trimmed.startsWith("data:")) {
    return value;
  }

  const version = createHash("sha256").update(trimmed).digest("hex").slice(0, 12);
  return `/api/settings/media?key=${encodeURIComponent(key)}&v=${version}`;
}

export function mapPublicMediaSettings<
  T extends Record<string, string | null>
>(settings: T): T {
  const mapped = { ...settings } as T;

  for (const key of PUBLIC_MEDIA_SETTING_KEYS) {
    if (Object.prototype.hasOwnProperty.call(mapped, key)) {
      mapped[key as keyof T] = toPublicMediaUrl(
        key,
        mapped[key as keyof T] as string | null | undefined
      ) as T[keyof T];
    }
  }

  return mapped;
}
