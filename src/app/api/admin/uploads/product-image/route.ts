import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/server";
import {
  PRODUCT_IMAGE_ALLOWED_CONTENT_TYPES,
  PRODUCT_IMAGE_MAX_FILE_SIZE,
  PRODUCT_IMAGE_UPLOAD_PREFIX,
} from "@/lib/uploads/product-image";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const isAdmin =
    user?.role === "superadmin" || user?.role === "admin" || user?.isAdmin;

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!isAdmin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json(
      { message: "Invalid upload request" },
      { status: 400 }
    );
  }

  try {
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(PRODUCT_IMAGE_UPLOAD_PREFIX)) {
          throw new Error("Invalid upload pathname");
        }

        return {
          allowedContentTypes: [...PRODUCT_IMAGE_ALLOWED_CONTENT_TYPES],
          maximumSizeInBytes: PRODUCT_IMAGE_MAX_FILE_SIZE,
          addRandomSuffix: true,
          cacheControlMaxAge: 60 * 60 * 24 * 30,
        };
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to prepare upload";
    return NextResponse.json({ message }, { status: 400 });
  }
}
