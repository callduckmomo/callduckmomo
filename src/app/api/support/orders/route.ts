import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { listOrdersByUser } from "@/lib/orders/repository";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const orders = await listOrdersByUser(user.id, 500);

    // กรองเฉพาะ orders ที่มี productTypeId และ productName
    const validOrders = orders
      .filter((order) => order.productTypeId && order.productName)
      .map((order) => ({
        id: order.id,
        productTypeId: order.productTypeId,
        productName: order.productName,
        productImage: order.productImage,
        purchaseDate: order.purchaseDate,
        accountEmail: order.accountEmail,
        accountPassword: order.accountPassword,
      }));

    return NextResponse.json({
      ok: true,
      orders: validOrders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ไม่สามารถดึงข้อมูลคำสั่งซื้อได้";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

