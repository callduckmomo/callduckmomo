export const LOGIN_BACKGROUND_ASPECT_RATIO = 16 / 9;
export const LOGIN_BACKGROUND_MAX_ASPECT_DEVIATION = 0.02;
export const LOGIN_BACKGROUND_MIN_WIDTH = 1920;
export const LOGIN_BACKGROUND_MIN_HEIGHT = 1080;
export const LOGIN_BACKGROUND_MAX_FILE_SIZE = 16 * 1024 * 1024;
export const LOGIN_BACKGROUND_ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/bmp",
] as const;

export const LOGIN_BACKGROUND_UPLOAD_PREFIX = "login-background/";

const LOGIN_BACKGROUND_EXTENSION_CONTENT_TYPES: Record<string, string> = {
  avif: "image/avif",
  bmp: "image/bmp",
  gif: "image/gif",
  jpe: "image/jpeg",
  jpeg: "image/jpeg",
  jfif: "image/jpeg",
  jpg: "image/jpeg",
  pjp: "image/jpeg",
  pjpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const LOGIN_BACKGROUND_CONTENT_TYPE_ALIASES: Record<string, string> = {
  "image/jpe": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/x-bmp": "image/bmp",
  "image/x-ms-bmp": "image/bmp",
};

export function isAllowedLoginBackgroundContentType(
  contentType: string
): boolean {
  return LOGIN_BACKGROUND_ALLOWED_CONTENT_TYPES.some(
    (allowedType) => allowedType === contentType
  );
}

export function resolveLoginBackgroundContentType(
  contentType: string,
  fileName: string
): string | null {
  const normalizedContentType = contentType.trim().toLowerCase();
  const canonicalContentType =
    LOGIN_BACKGROUND_CONTENT_TYPE_ALIASES[normalizedContentType] ??
    normalizedContentType;

  if (isAllowedLoginBackgroundContentType(canonicalContentType)) {
    return canonicalContentType;
  }

  const extension = fileName.toLowerCase().split(".").pop() ?? "";
  return LOGIN_BACKGROUND_EXTENSION_CONTENT_TYPES[extension] ?? null;
}

export function isLoginBackgroundAspectRatioAllowed(
  width: number,
  height: number
): boolean {
  if (width <= 0 || height <= 0) {
    return false;
  }

  const aspectRatio = width / height;
  const relativeDeviation = Math.abs(
    aspectRatio / LOGIN_BACKGROUND_ASPECT_RATIO - 1
  );

  return relativeDeviation <= LOGIN_BACKGROUND_MAX_ASPECT_DEVIATION;
}
