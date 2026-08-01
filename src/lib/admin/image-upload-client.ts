import { upload } from "@vercel/blob/client";

import {
  PRODUCT_IMAGE_ACCEPT,
  PRODUCT_IMAGE_MAX_FILE_SIZE,
  PRODUCT_IMAGE_UPLOAD_PREFIX,
  resolveProductImageContentType,
} from "@/lib/uploads/product-image";

export { PRODUCT_IMAGE_ACCEPT as ADMIN_IMAGE_ACCEPT };

export async function uploadAdminImage(file: File): Promise<string> {
  const contentType = resolveProductImageContentType(file.type, file.name);

  if (!contentType) {
    throw new Error("รองรับเฉพาะไฟล์รูปภาพที่กำหนดเท่านั้น");
  }

  if (file.size <= 0) {
    throw new Error("ไฟล์รูปภาพว่างเปล่า");
  }

  if (file.size > PRODUCT_IMAGE_MAX_FILE_SIZE) {
    throw new Error("ไฟล์รูปภาพต้องมีขนาดไม่เกิน 16 MB");
  }

  const safeFileName =
    file.name
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "product-image";

  const blob = await upload(
    `${PRODUCT_IMAGE_UPLOAD_PREFIX}${Date.now()}-${safeFileName}`,
    file,
    {
      access: "public",
      contentType,
      handleUploadUrl: "/api/admin/uploads/product-image",
    }
  );

  return blob.url;
}
