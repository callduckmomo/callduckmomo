import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { findProductByTypeId, syncProductToFirestore } from "@/lib/products/repository";

export async function POST(request: NextRequest) {
  try {
    const { typeId, secret } = await request.json();
    
    // ตรวจสอบ Secret Key
    if (!secret || secret !== process.env.MAIN_SITE_SYNC_SECRET) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (!typeId) {
      return NextResponse.json({ success: false, message: "Missing typeId" }, { status: 400 });
    }

    const product = await findProductByTypeId(typeId);
    if (product) {
      await syncProductToFirestore(product).catch(err => console.error("Firestore sync error:", err));
    }

    (revalidateTag as any)("products");

    return NextResponse.json({ success: true, message: "Sync successful" });
  } catch (error) {
    console.error("Sync main site error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
