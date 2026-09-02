import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/server";
import {
  appendMediaAssetChunk,
  createMediaAsset,
  getMediaAssetState,
} from "@/lib/media/repository";

// Keep every request comfortably below common serverless request-body limits.
// The complete file is assembled in the database, not in Vercel Blob.
export const DATABASE_IMAGE_CHUNK_SIZE = 2 * 1024 * 1024;

type UploadHandlerOptions = {
  allowedContentTypes: readonly string[];
  maxFileSize: number;
  resolveContentType: (contentType: string, fileName: string) => string | null;
};

function isAdminUser(user: Awaited<ReturnType<typeof getCurrentUser>>): boolean {
  return Boolean(
    user?.role === "superadmin" || user?.role === "admin" || user?.isAdmin
  );
}

function textField(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ message }, { status });
}

export async function handleDatabaseImageUpload(
  request: Request,
  options: UploadHandlerOptions
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return jsonError("Unauthorized", 401);
  if (!isAdminUser(user)) return jsonError("Forbidden", 403);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Invalid upload request", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return jsonError("กรุณาเลือกไฟล์รูปภาพ", 400);
  }

  const fileName = textField(formData.get("fileName")) || file.name || "image";
  const declaredContentType =
    textField(formData.get("contentType")) || file.type || "";
  const contentType = options.resolveContentType(
    declaredContentType,
    fileName
  );

  if (!contentType || !options.allowedContentTypes.includes(contentType)) {
    return jsonError("ไม่รองรับชนิดไฟล์รูปภาพนี้", 415);
  }

  const expectedSize = Number.parseInt(textField(formData.get("fileSize")), 10);
  const chunkIndex = Number.parseInt(textField(formData.get("chunkIndex")), 10);
  const totalChunks = Number.parseInt(textField(formData.get("totalChunks")), 10);
  const uploadId = textField(formData.get("uploadId"));

  if (
    !Number.isSafeInteger(expectedSize) ||
    expectedSize <= 0 ||
    expectedSize > options.maxFileSize
  ) {
    return jsonError(
      `ไฟล์รูปภาพต้องมีขนาดไม่เกิน ${Math.floor(options.maxFileSize / 1024 / 1024)} MB`,
      413
    );
  }

  const expectedChunkCount = Math.max(
    1,
    Math.ceil(expectedSize / DATABASE_IMAGE_CHUNK_SIZE)
  );
  if (
    !Number.isSafeInteger(chunkIndex) ||
    !Number.isSafeInteger(totalChunks) ||
    chunkIndex < 0 ||
    totalChunks !== expectedChunkCount ||
    chunkIndex >= totalChunks
  ) {
    return jsonError("ข้อมูลการอัปโหลดไม่ถูกต้อง", 422);
  }

  const chunk = Buffer.from(await file.arrayBuffer());
  const isFirstChunk = chunkIndex === 0;
  const isLastChunk = chunkIndex === totalChunks - 1;
  const expectedChunkBytes = Math.min(
    DATABASE_IMAGE_CHUNK_SIZE,
    expectedSize - chunkIndex * DATABASE_IMAGE_CHUNK_SIZE
  );
  if (chunk.byteLength !== expectedChunkBytes) {
    return jsonError("ขนาดชิ้นส่วนไฟล์ไม่ถูกต้อง", 422);
  }

  try {
    if (isFirstChunk && !uploadId) {
      const id = randomUUID();
      const state = await createMediaAsset({
        id,
        contentType,
        expectedSize,
        totalChunks,
        data: chunk,
        nextChunk: 1,
        isComplete: isLastChunk,
      });

      return NextResponse.json({
        uploadId: id,
        complete: state.complete,
        url: state.complete ? `/api/media/${id}` : undefined,
        receivedBytes: state.receivedSize,
        totalBytes: state.expectedSize,
      });
    }

    if (!uploadId) {
      return jsonError("ไม่พบรหัสการอัปโหลด", 400);
    }

    const current = await getMediaAssetState(uploadId);
    if (!current) return jsonError("ไม่พบรายการอัปโหลด", 404);

    if (
      current.contentType !== contentType ||
      current.expectedSize !== expectedSize ||
      current.totalChunks !== totalChunks
    ) {
      return jsonError("ข้อมูลไฟล์ไม่ตรงกับรายการอัปโหลด", 409);
    }

    if (current.complete) {
      return NextResponse.json({
        uploadId,
        complete: true,
        url: `/api/media/${uploadId}`,
        receivedBytes: current.receivedSize,
        totalBytes: current.expectedSize,
      });
    }

    if (chunkIndex < current.nextChunk) {
      return NextResponse.json({
        uploadId,
        complete: false,
        receivedBytes: current.receivedSize,
        totalBytes: current.expectedSize,
      });
    }

    if (chunkIndex > current.nextChunk) {
      return jsonError("ต้องอัปโหลดชิ้นส่วนไฟล์ตามลำดับ", 409);
    }

    const updated = await appendMediaAssetChunk({
      id: uploadId,
      chunkIndex,
      data: chunk,
      isComplete: isLastChunk,
    });
    if (!updated) {
      return jsonError("รายการอัปโหลดถูกแก้ไขพร้อมกัน กรุณาลองใหม่", 409);
    }

    return NextResponse.json({
      uploadId,
      complete: updated.complete,
      url: updated.complete ? `/api/media/${uploadId}` : undefined,
      receivedBytes: updated.receivedSize,
      totalBytes: updated.expectedSize,
    });
  } catch (error) {
    console.error("Database image upload error:", error);
    return jsonError("ไม่สามารถบันทึกรูปภาพลงฐานข้อมูลได้", 500);
  }
}
