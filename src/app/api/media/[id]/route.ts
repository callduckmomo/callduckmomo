import { NextRequest, NextResponse } from "next/server";

import { getMediaAsset } from "@/lib/media/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ message: "Media not found" }, { status: 404 });
  }

  try {
    const asset = await getMediaAsset(id);
    if (!asset || asset.is_complete !== 1 || !asset.data) {
      return NextResponse.json({ message: "Media not found" }, { status: 404 });
    }

    const bytes = asset.data;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        try {
          const chunkSize = 64 * 1024;
          for (let offset = 0; offset < bytes.byteLength; offset += chunkSize) {
            controller.enqueue(bytes.subarray(offset, offset + chunkSize));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": asset.content_type,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error serving database media:", error);
    return NextResponse.json({ message: "Media unavailable" }, { status: 500 });
  }
}
