import { handleDatabaseImageUpload } from "@/lib/media/upload-handler";
import {
  PRODUCT_IMAGE_ALLOWED_CONTENT_TYPES,
  PRODUCT_IMAGE_MAX_FILE_SIZE,
  resolveProductImageContentType,
} from "@/lib/uploads/product-image";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleDatabaseImageUpload(request, {
    allowedContentTypes: PRODUCT_IMAGE_ALLOWED_CONTENT_TYPES,
    maxFileSize: PRODUCT_IMAGE_MAX_FILE_SIZE,
    resolveContentType: resolveProductImageContentType,
  });
}
