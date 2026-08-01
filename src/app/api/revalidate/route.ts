import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, tag, path } = body;

    // Check for secret to confirm this is a valid request
    const validSecret = process.env.REVALIDATE_SECRET || "mari-studio-secret";
    if (secret !== validSecret) {
      return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
    }

    if (tag) {
      (revalidateTag as any)(tag);
    }
    
    if (path) {
      revalidatePath(path);
    }

    if (!tag && !path) {
      return NextResponse.json(
        { message: "Missing tag or path" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      revalidated: true,
      tag: tag || null,
      path: path || null,
      now: Date.now(),
    });
  } catch (err) {
    return NextResponse.json(
      { message: "Error revalidating", error: String(err) },
      { status: 500 }
    );
  }
}
