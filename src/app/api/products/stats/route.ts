import { NextResponse } from "next/server";
import { countTotalStockAndProducts } from "@/lib/products/repository";



export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const stats = await countTotalStockAndProducts();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching product stats:", error);
    return NextResponse.json(
      { totalStock: 0, productCount: 0 },
      { status: 200 }
    );
  }
}
