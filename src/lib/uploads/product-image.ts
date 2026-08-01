export const PRODUCT_IMAGE_MAX_FILE_SIZE = 16 * 1024 * 1024;

export const PRODUCT_IMAGE_ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/bmp",
  "image/tiff",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/svg+xml",
  "image/heic",
  "image/heif",
] as const;

export const PRODUCT_IMAGE_UPLOAD_PREFIX = "product-images/";

const PRODUCT_IMAGE_EXTENSION_CONTENT_TYPES: Record<string, string> = {
  avif: "image/avif",
  bmp: "image/bmp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  ico: "image/x-icon",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  tif: "image/tiff",
  tiff: "image/tiff",
  webp: "image/webp",
};

const PRODUCT_IMAGE_CONTENT_TYPE_ALIASES: Record<string, string> = {
  "image/x-bmp": "image/bmp",
  "image/x-ms-bmp": "image/bmp",
};

export const PRODUCT_IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,image/avif,image/bmp,image/tiff,image/svg+xml,image/x-icon,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.gif,.avif,.bmp,.tif,.tiff,.svg,.ico,.heic,.heif";

export function resolveProductImageContentType(
  contentType: string,
  fileName: string
): string | null {
  const normalizedContentType = contentType.trim().toLowerCase();
  const canonicalContentType =
    PRODUCT_IMAGE_CONTENT_TYPE_ALIASES[normalizedContentType] ??
    normalizedContentType;

  if (
    PRODUCT_IMAGE_ALLOWED_CONTENT_TYPES.some(
      (allowedType) => allowedType === canonicalContentType
    )
  ) {
    return canonicalContentType;
  }

  const extension = fileName.toLowerCase().split(".").pop() ?? "";
  return PRODUCT_IMAGE_EXTENSION_CONTENT_TYPES[extension] ?? null;
}
