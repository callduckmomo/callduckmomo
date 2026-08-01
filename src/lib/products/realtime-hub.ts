import { collection, onSnapshot } from "firebase/firestore";
import { clientDb } from "@/lib/firebase-client";
import {
  rowToProductLivePatch,
  type ProductLivePatch,
  type ProductRealtimeRow,
} from "@/lib/products/realtime-types";

export type ProductRealtimeListener = (patch: ProductLivePatch) => void;

const listeners = new Set<ProductRealtimeListener>();
let unsubscribeSnapshot: (() => void) | null = null;
let subscriberCount = 0;
const realtimePushEnabled =
  process.env.NEXT_PUBLIC_FIREBASE_REALTIME_ENABLED === "true";

function emit(patch: ProductLivePatch) {
  listeners.forEach((listener) => {
    try {
      listener(patch);
    } catch (error) {
      console.error("[realtime] listener error:", error);
    }
  });
}

function handleDocChange(
  type: "added" | "modified" | "removed",
  docId: string,
  data: Record<string, unknown>
) {
  if (type === "removed") {
    emit({
      id: docId,
      typeId: typeof data.type_id === "string" ? data.type_id : "",
      stock: 0,
      badge: null,
      isPublished: false,
      price: null,
      priceVip: null,
      priceWalkin: null,
    });
    return;
  }

  // Preserve dynamic site fields such as price_child_template_1.
  const row: ProductRealtimeRow = {
    ...data,
    id: docId,
    type_id: typeof data.type_id === "string" ? data.type_id : "",
    stock: data.stock == null ? null : Number(data.stock),
    account_data: data.account_data ?? null,
    badge:
      data.badge === "hot_sale" || data.badge === "recommended"
        ? data.badge
        : null,
    is_published: Boolean(data.is_published),
  };

  const patch = rowToProductLivePatch(row);
  if (patch) {
    emit(patch);
  }
}

function ensureChannel() {
  if (!realtimePushEnabled) {
    return;
  }
  if (unsubscribeSnapshot) {
    return;
  }

  try {
    const productsCol = collection(clientDb, "products");
    
    unsubscribeSnapshot = onSnapshot(productsCol, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const docId = change.doc.id;
        const data = change.doc.data() as Record<string, unknown>;
        handleDocChange(change.type, docId, data);
      });
    }, (error) => {
      console.warn("[realtime] Firestore listener error:", error.message);
    });
  } catch (error: any) {
    console.error("[realtime] Failed to setup Firestore listener:", error.message);
  }
}

function teardownChannel() {
  if (!unsubscribeSnapshot) {
    return;
  }
  unsubscribeSnapshot();
  unsubscribeSnapshot = null;
}

/** สมัครรับการเปลี่ยนแปลงสต็อกสินค้า (channel เดียวต่อแท็บ) */
export function subscribeProductStockRealtime(
  listener: ProductRealtimeListener
): () => void {
  listeners.add(listener);
  subscriberCount += 1;
  ensureChannel();

  return () => {
    listeners.delete(listener);
    subscriberCount -= 1;
    if (subscriberCount <= 0) {
      subscriberCount = 0;
      teardownChannel();
    }
  };
}
