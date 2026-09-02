import { handleDatabaseImageUpload } from "@/lib/media/upload-handler";
import {
  LOGIN_BACKGROUND_ALLOWED_CONTENT_TYPES,
  LOGIN_BACKGROUND_MAX_FILE_SIZE,
  resolveLoginBackgroundContentType,
} from "@/lib/uploads/login-background";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleDatabaseImageUpload(request, {
    allowedContentTypes: LOGIN_BACKGROUND_ALLOWED_CONTENT_TYPES,
    maxFileSize: LOGIN_BACKGROUND_MAX_FILE_SIZE,
    resolveContentType: resolveLoginBackgroundContentType,
  });
}
