import { NextRequest, NextResponse } from "next/server";
import { getSettingValue } from "@/lib/settings/repository";
import { PUBLIC_MEDIA_SETTING_KEYS } from "@/lib/settings/public-media";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PUBLIC_MEDIA_KEY_SET = new Set<string>(PUBLIC_MEDIA_SETTING_KEYS);
const MAX_MEDIA_BYTES = 16 * 1024 * 1024;

function decodeDataUrl(value: string): { mimeType: string; bytes: Buffer } | null {
  if (!value.startsWith("data:")) return null;

  const commaIndex = value.indexOf(",");
  if (commaIndex < 0) return null;

  const metadata = value.slice(5, commaIndex);
  const payload = value.slice(commaIndex + 1);
  const mimeType = metadata.split(";")[0] || "application/octet-stream";

  try {
    if (metadata.toLowerCase().includes(";base64")) {
      return { mimeType, bytes: Buffer.from(payload.replace(/\s/g, ""), "base64") };
    }

    return { mimeType, bytes: Buffer.from(decodeURIComponent(payload), "utf8") };
  } catch {
    return null;
  }
}
export async function GET(request: NextRequest) {
  const key = new URL(request.url).searchParams.get("key")?.trim() || "";

  if (!PUBLIC_MEDIA_KEY_SET.has(key)) {
    return NextResponse.json({ message: "Invalid public media key" }, { status: 400 });
  }

  try {
    const value = await getSettingValue(key);
    const decoded = value ? decodeDataUrl(value) : null;

    // External/blob URLs remain direct URLs in the page and do not need this route.
    if (!decoded) {
      return NextResponse.json({ message: "Media not found" }, { status: 404 });
    }

    if (decoded.bytes.byteLength > MAX_MEDIA_BYTES) {
      return NextResponse.json({ message: "Media is too large" }, { status: 413 });
    }

    return new NextResponse(new Uint8Array(decoded.bytes), {
      status: 200,
      headers: {
        "Content-Type": decoded.mimeType,
        "Content-Length": String(decoded.bytes.byteLength),
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error serving public media:", error);
    return NextResponse.json({ message: "Media unavailable" }, { status: 500 });
  }
}
