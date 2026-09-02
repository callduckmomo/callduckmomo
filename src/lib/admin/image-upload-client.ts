import {
  LOGIN_BACKGROUND_ALLOWED_CONTENT_TYPES,
  LOGIN_BACKGROUND_MAX_FILE_SIZE,
  resolveLoginBackgroundContentType,
} from "@/lib/uploads/login-background";
import {
  PRODUCT_IMAGE_ACCEPT,
  PRODUCT_IMAGE_ALLOWED_CONTENT_TYPES,
  PRODUCT_IMAGE_MAX_FILE_SIZE,
  resolveProductImageContentType,
} from "@/lib/uploads/product-image";

export { PRODUCT_IMAGE_ACCEPT as ADMIN_IMAGE_ACCEPT };

type UploadOptions = {
  endpoint: string;
  maxFileSize: number;
  allowedContentTypes: readonly string[];
  resolveContentType: (contentType: string, fileName: string) => string | null;
  onProgress?: (percentage: number) => void;
};

const UPLOAD_CHUNK_SIZE = 2 * 1024 * 1024;

function safeFileName(fileName: string): string {
  return (
    fileName
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "image"
  );
}
async function uploadDatabaseImage(file: File, options: UploadOptions): Promise<string> {
  const contentType = options.resolveContentType(file.type, file.name);

  if (!contentType || !options.allowedContentTypes.includes(contentType)) {
    throw new Error("ไม่รองรับชนิดไฟล์รูปภาพนี้");
  }

  if (file.size <= 0) {
    throw new Error("ไฟล์รูปภาพว่างเปล่า");
  }

  if (file.size > options.maxFileSize) {
    throw new Error(
      `ไฟล์รูปภาพต้องมีขนาดไม่เกิน ${Math.floor(options.maxFileSize / 1024 / 1024)} MB`
    );
  }

  const name = safeFileName(file.name);
  const totalChunks = Math.max(1, Math.ceil(file.size / UPLOAD_CHUNK_SIZE));
  let uploadId = "";
  options.onProgress?.(0);

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
    const start = chunkIndex * UPLOAD_CHUNK_SIZE;
    const end = Math.min(file.size, start + UPLOAD_CHUNK_SIZE);
    const chunk = file.slice(start, end, contentType);
    const formData = new FormData();
    formData.append("file", chunk, name);
    formData.append("fileName", name);
    formData.append("contentType", contentType);
    formData.append("fileSize", String(file.size));
    formData.append("chunkIndex", String(chunkIndex));
    formData.append("totalChunks", String(totalChunks));
    if (uploadId) formData.append("uploadId", uploadId);

    const response = await fetch(options.endpoint, {
      method: "POST",
      body: formData,
      credentials: "include",
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as
      | {
          uploadId?: string;
          complete?: boolean;
          url?: string;
          receivedBytes?: number;
          message?: string;
        }
      | null;

    if (!response.ok) {
      throw new Error(payload?.message || "ไม่สามารถอัปโหลดรูปภาพได้");
    }

    uploadId = payload?.uploadId || uploadId;
    options.onProgress?.(
      Math.min(100, Math.round(((payload?.receivedBytes || end) / file.size) * 100))
    );

    if (payload?.complete && payload.url) {
      return payload.url;
    }
  }

  throw new Error("การอัปโหลดรูปภาพยังไม่เสร็จสมบูรณ์");
}

export async function uploadAdminImage(
  file: File,
  onProgress?: (percentage: number) => void
): Promise<string> {
  return uploadDatabaseImage(file, {
    endpoint: "/api/admin/uploads/product-image",
    maxFileSize: PRODUCT_IMAGE_MAX_FILE_SIZE,
    allowedContentTypes: PRODUCT_IMAGE_ALLOWED_CONTENT_TYPES,
    resolveContentType: resolveProductImageContentType,
    onProgress,
  });
}

export async function uploadAdminLoginBackground(
  file: File,
  onProgress?: (percentage: number) => void
): Promise<string> {
  return uploadDatabaseImage(file, {
    endpoint: "/api/admin/uploads/login-background",
    maxFileSize: LOGIN_BACKGROUND_MAX_FILE_SIZE,
    allowedContentTypes: LOGIN_BACKGROUND_ALLOWED_CONTENT_TYPES,
    resolveContentType: resolveLoginBackgroundContentType,
    onProgress,
  });
}
