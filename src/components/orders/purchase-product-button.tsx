"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Loader2, Copy, Check, Plus, Minus } from "lucide-react";
import { toast } from "sonner";

import { cn, normalizeNewlines } from "@/lib/utils";
import { useSession } from "@/lib/auth/use-session";
import { getPriceByTier } from "@/lib/utils/pricing";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type PurchaseProductButtonProps = {
  typeId: string;
  productName: string;
  productDescription?: string | null;
  price?: number | null;
  priceVip?: number | null;
  priceWalkin?: number | null;
  stock?: number | null;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
};

type OrderData = {
  id: string;
  productName: string;
  productDetails: string | null;
  accountEmail: string | null;
  accountPassword: string | null;
  price: number | null;
  purchaseDate: string | null;
};

type GiftChoice = {
  giftTypeId: string;
  name: string;
  stock: number | null;
  imageUrl: string | null;
};

type PurchaseState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "success";
      order: OrderData;
      orders?: OrderData[]; // สำหรับกรณีซื้อหลายชิ้น
      reference: string | null;
      remainingPoints?: number | null;
      gifts?:
        | {
            giftProductTypeId: string;
            giftProductName: string;
            giftProductDetails: string | null;
            giftAccountEmail: string | null;
            giftAccountPassword: string | null;
          }[]
        | null;
    };

const buttonBaseClass = cn(
  "group relative inline-flex w-full items-center justify-center overflow-hidden rounded-full border border-[var(--theme-color)]/70 bg-[var(--theme-color)] px-6 py-3 text-base font-semibold text-white shadow-[0_10px_30px_rgba(223,156,155,0.25)] transition-all duration-300 ease-out",
  "hover:-translate-y-0.5 hover:border-[var(--theme-color)] hover:bg-[var(--theme-color)] hover:shadow-[0_16px_40px_rgba(223,156,155,0.35)]",
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-color)] focus-visible:ring-offset-2",
  "active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
);

export function PurchaseProductButton({
  typeId,
  productName,
  productDescription,
  price,
  priceVip,
  priceWalkin,
  stock,
  children,
  className,
  disabled = false,
}: PurchaseProductButtonProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<PurchaseState>({ status: "idle" });
  const [quantity, setQuantity] = useState(1);
  const [giftChoices, setGiftChoices] = useState<GiftChoice[]>([]);
  const [selectedGiftTypeId, setSelectedGiftTypeId] = useState<string>("");
  const purchaseAttemptRef = useRef<{
    fingerprint: string;
    requestId: string;
  } | null>(null);
  const { user, refreshSession } = useSession();
  const availablePoints = user?.points ?? null;
  const isOutOfStock = disabled || (stock ?? 0) <= 0;
  const userTier = user?.tier ?? 'normal';

  // คำนวณราคาตาม tier
  const effectivePrice = useMemo(() => {
    return getPriceByTier(price ?? null, priceVip ?? null, priceWalkin ?? null, userTier);
  }, [price, priceVip, priceWalkin, userTier]);

  const formattedPrice = useMemo(() => {
    if (effectivePrice == null) return "-";
    if (effectivePrice === 0) return "ฟรี";
    return `${effectivePrice.toLocaleString("th-TH", { minimumFractionDigits: 2 })} พ้อยท์`;
  }, [effectivePrice]);

  const productDescriptionText = useMemo(() => {
    if (!productDescription) return null;
    const stripped = productDescription.replace(/<[^>]+>/g, "");
    const normalized = normalizeNewlines(stripped.trim());
    return normalized.length > 0 ? normalized : null;
  }, [productDescription]);

  const totalPrice = useMemo(() => {
    if (effectivePrice == null || quantity <= 0) return null;
    return effectivePrice * quantity;
  }, [effectivePrice, quantity]);

  const expectedRemainingPoints = useMemo(() => {
    if (availablePoints == null || totalPrice == null) return null;
    return Math.max(0, availablePoints - totalPrice);
  }, [availablePoints, totalPrice]);

  const resetState = () => {
    setState({ status: "idle" });
    setQuantity(1);
    setGiftChoices([]);
    setSelectedGiftTypeId("");
  };

  const handleQuantityChange = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num > 0 && num <= 100) {
      setQuantity(num);
    } else if (value === "" || value === "0") {
      setQuantity(1);
    }
  };

  const incrementQuantity = () => {
    if (quantity < 100) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handlePurchase = async () => {
    if (quantity <= 0 || quantity > 100) {
      toast.error("กรุณาระบุจำนวนสินค้าระหว่าง 1-100 ชิ้น");
      return;
    }

    if (totalPrice != null && availablePoints != null && availablePoints < totalPrice) {
      toast.error("พ้อยท์ของคุณไม่เพียงพอสำหรับสั่งซื้อสินค้านี้");
      return;
    }

    // ถ้ามีของแถม ต้องเลือกก่อน
    if (giftChoices.length > 0 && !selectedGiftTypeId) {
      toast.error("กรุณาเลือกของแถมก่อนสั่งซื้อ");
      return;
    }

    setState({ status: "loading" });
    const purchaseFingerprint = JSON.stringify({
      typeId,
      quantity,
      giftTypeId: selectedGiftTypeId || null,
    });
    const currentAttempt =
      purchaseAttemptRef.current?.fingerprint === purchaseFingerprint
        ? purchaseAttemptRef.current
        : {
            fingerprint: purchaseFingerprint,
            requestId: crypto.randomUUID(),
          };
    purchaseAttemptRef.current = currentAttempt;

    try {
      const response = await fetch("/api/orders/buy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          typeId,
          quantity,
          giftTypeId: selectedGiftTypeId || undefined,
          requestId: currentAttempt.requestId,
        }),
      });

      let responsePayload: any = {};
      try {
        responsePayload = await response.json();
      } catch (err) {
        // ถ้าแปลง JSON ไม่ได้ (เช่น 504 Gateway Timeout คืนค่าเป็น HTML)
        console.error("Failed to parse JSON. Status:", response.status);
        responsePayload = { ok: false, message: `ระบบไม่สามารถตอบสนองได้ (HTTP ${response.status}) กรุณาลองใหม่อีกครั้ง` };
      }

      if (!response.ok || responsePayload?.ok === false) {
        const errorPayload = responsePayload;
        if (response.status < 500 && errorPayload?.retryable !== true) {
          purchaseAttemptRef.current = null;
        }
        const message =
          typeof errorPayload?.message === "string"
            ? errorPayload.message
            : `สั่งซื้อไม่สำเร็จ (HTTP ${response.status}) กรุณาลองใหม่อีกครั้ง`;
        throw new Error(message);
      }

      const payload = responsePayload as {
        ok: boolean;
        message?: string;
        points?: number;
        order?: OrderData | OrderData[];
        orders?: OrderData[];
        quantity?: number;
        gifts?:
          | {
              giftProductTypeId: string;
              giftProductName: string;
              giftProductDetails: string | null;
              giftAccountEmail: string | null;
              giftAccountPassword: string | null;
            }[]
          | null;
      };

      if (!payload.ok || !payload.order) {
        throw new Error(payload.message ?? "สั่งซื้อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      }

      // ตรวจสอบว่าเป็น array หรือ object เดียว
      const ordersArray = payload.orders || (Array.isArray(payload.order) ? payload.order : [payload.order]);
      const firstOrder = Array.isArray(payload.order) ? payload.order[0] : payload.order;

      setState({
        status: "success",
        order: firstOrder,
        orders: ordersArray.length > 1 ? ordersArray : undefined,
        reference: firstOrder.id,
        remainingPoints: typeof payload.points === "number" ? payload.points : null,
        gifts: payload.gifts ?? null,
      });
      purchaseAttemptRef.current = null;

      const successMessage = quantity > 1 
        ? `สั่งซื้อสินค้าสำเร็จ ${quantity} ชิ้น`
        : payload.message ?? "สั่งซื้อสินค้าสำเร็จ";

      toast.success(successMessage, {
        description: `${firstOrder.productName}`,
      });

      void refreshSession();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "ไม่สามารถสั่งซื้อสินค้าได้ กรุณาลองใหม่อีกครั้ง";
      toast.error(message);
      setState({ status: "idle" });
    }
  };

  const closeDialog = () => {
    if (state.status === "loading") {
      return;
    }
    setOpen(false);
    // quantity จะรีเซ็ตอัตโนมัติผ่าน useEffect เมื่อ dialog ปิด
  };

  // รีเซ็ต quantity เมื่อปิด dialog
  useEffect(() => {
    if (!open && state.status === "idle") {
      setQuantity(1);
    }
  }, [open, state.status]);

  // โหลดตัวเลือกของแถมเมื่อเปิด dialog
  useEffect(() => {
    if (!open) return;
    // ถ้าไม่ล็อกอิน ยังไม่โหลด
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/products/gifts?typeId=${encodeURIComponent(typeId)}`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { gifts: GiftChoice[] };
        if (cancelled) return;
        const gifts = Array.isArray(data.gifts) ? data.gifts : [];
        setGiftChoices(gifts);
        setSelectedGiftTypeId("");
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, typeId, user]);

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? closeDialog() : setOpen(true))}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(buttonBaseClass, className, isOutOfStock && "opacity-50 cursor-not-allowed")}
          onClick={() => !isOutOfStock && setOpen(true)}
          disabled={isOutOfStock}
        >
          <span className="flex items-center gap-2 transition-all duration-300 group-hover:translate-x-8 group-hover:opacity-0">
            <span className="size-2.5 rounded-full bg-white/70 transition-transform duration-300 group-hover:scale-150 group-hover:bg-white" />
            <span>{children}</span>
          </span>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex translate-x-10 items-center justify-center gap-2 text-white opacity-0 transition-all duration-300 group-hover:-translate-x-3 group-hover:opacity-100"
          >
            <span>{children}</span>
            <ArrowRight className="size-4" />
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="bg-white w-[95vw] max-w-lg overflow-x-hidden md:w-full">
        {state.status !== "success" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-[#0B0B0B]">
                ยืนยันการสั่งซื้อสินค้า
              </DialogTitle>
              <DialogDescription className="text-sm text-[#6B7280]">
                ระบบจะหักพ้อยท์ตามราคาสินค้า ทำการสั่งซื้อจาก API ต้นทาง และบันทึกข้อมูลไว้ในบัญชีของคุณ
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 rounded-2xl bg-[#F9FAFB] p-4 text-sm text-[#0B0B0B]">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-[#6B7280]">สินค้า</span>
                <span className="font-semibold whitespace-pre-line">{normalizeNewlines(productName)}</span>
              </div>
              {productDescriptionText ? (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-[#6B7280]">รายละเอียดสินค้า</span>
                  <span className="whitespace-pre-line text-[#4B5563]">{productDescriptionText}</span>
                </div>
              ) : null}
              <div className="flex flex-col gap-2">
                <span className="text-xs text-[#6B7280]">จำนวน</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={decrementQuantity}
                    disabled={quantity <= 1 || state.status === "loading"}
                    className="flex size-9 items-center justify-center rounded-lg border border-[var(--theme-color)]/40 bg-white text-[var(--theme-color)] transition-colors hover:border-[var(--theme-color)] hover:bg-[#fff4ed] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus className="size-4" />
                  </button>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    disabled={state.status === "loading"}
                    className="h-9 w-20 text-center font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={incrementQuantity}
                    disabled={quantity >= 100 || state.status === "loading"}
                    className="flex size-9 items-center justify-center rounded-lg border border-[var(--theme-color)]/40 bg-white text-[var(--theme-color)] transition-colors hover:border-[var(--theme-color)] hover:bg-[#fff4ed] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>

              {giftChoices.length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-xs text-[#6B7280]">เลือกของแถม</Label>
                  <Select
                    value={selectedGiftTypeId}
                    onValueChange={(v) => setSelectedGiftTypeId(v)}
                    disabled={state.status === "loading"}
                  >
                    <SelectTrigger className="bg-white border-[#E5E7EB]">
                      <SelectValue placeholder="เลือกของแถม 1 รายการ" />
                    </SelectTrigger>
                    <SelectContent>
                      {giftChoices.map((g) => (
                        <SelectItem key={g.giftTypeId} value={g.giftTypeId}>
                          {g.name}
                          {typeof g.stock === "number" ? ` • stock ${g.stock}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-[#6B7280]">
                    ของแถมจะถูกจ่ายหลังสั่งซื้อสำเร็จ (เฉพาะรายการที่ตั้งค่าไว้)
                  </p>
                </div>
              ) : null}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-[#6B7280]">฿ ที่ใช้</span>
                <span className="font-semibold text-[var(--theme-color)]">
                  {totalPrice != null ? (totalPrice === 0 ? "ฟรี" : `${totalPrice.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿`) : formattedPrice.replace('พ้อยท์', '฿')}
                  {quantity > 1 && effectivePrice != null && (
                    <span className="ml-2 text-xs font-normal text-[#9CA3AF]">
                      ({effectivePrice === 0 ? "ฟรี" : `${effectivePrice.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿`} × {quantity})
                    </span>
                  )}
                </span>
                {userTier === 'vip' && priceVip != null && price != null && priceVip < price && (
                  <span className="text-xs text-[#10B981]">
                    ราคา VIP: ฿{priceVip.toLocaleString()} (ประหยัด ฿{(price - priceVip).toLocaleString()})
                  </span>
                )}
              </div>
              {availablePoints != null ? (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-[#6B7280]">฿ ที่มีอยู่</span>
                  <span className="font-semibold text-[#0B0B0B]">
                    {availablePoints.toLocaleString()} ฿
                  </span>
                  {expectedRemainingPoints != null ? (
                    <span className="text-xs text-[#6B7280]">
                      หลังสั่งซื้อจะเหลือประมาณ
                      <span className="pl-1 font-semibold text-[var(--theme-color)]">
                        {expectedRemainingPoints.toLocaleString()} ฿
                      </span>
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
            <DialogFooter>
              <button
                type="button"
                className="h-10 rounded-full border border-[var(--theme-color)]/40 px-6 text-sm font-semibold text-[var(--theme-color)] transition-colors hover:border-[var(--theme-color)] hover:bg-[var(--theme-color)]/10 hover:text-[var(--theme-color)]"
                onClick={closeDialog}
                disabled={state.status === "loading"}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="flex h-10 items-center justify-center rounded-full bg-[var(--theme-color)] px-6 text-sm font-semibold text-white transition-colors hover:bg-[var(--theme-color)] disabled:opacity-70"
                onClick={handlePurchase}
                disabled={state.status === "loading"}
              >
                {state.status === "loading" ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    กำลังสั่งซื้อ...
                  </span>
                ) : (
                  "ยืนยันสั่งซื้อ"
                )}
              </button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-[#0B0B0B]">
                สั่งซื้อสำเร็จ
              </DialogTitle>
              <DialogDescription className="text-sm text-[#6B7280]">
                กรุณาเก็บข้อมูลบัญชีไว้ใช้งาน หากมีปัญหาให้ติดต่อทีมงานพร้อมแจ้งเลขอ้างอิง
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 rounded-2xl bg-[#F9FAFB] p-4">
              <div className="space-y-1 text-sm">
                <span className="text-xs text-[#6B7280]">สินค้า</span>
                <p className="font-semibold text-[#0B0B0B] whitespace-pre-line">{normalizeNewlines(state.order.productName)}</p>
              </div>
              <div className="space-y-1 text-sm">
                <span className="text-xs text-[#6B7280]">฿ ที่ใช้</span>
                <p className="font-semibold text-[var(--theme-color)]">
                  {state.order.price != null
                    ? (state.order.price === 0 ? "ฟรี" : `${(state.order.price * quantity).toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿`)
                    : (totalPrice != null ? (totalPrice === 0 ? "ฟรี" : `${totalPrice.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿`) : formattedPrice.replace('พ้อยท์', '฿'))}
                  {quantity > 1 && effectivePrice != null && (
                    <span className="ml-2 text-xs font-normal text-[#9CA3AF]">
                      ({effectivePrice === 0 ? "ฟรี" : `${effectivePrice.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿`} × {quantity})
                    </span>
                  )}
                </p>
              </div>
              {quantity > 1 && (
                <div className="space-y-1 text-sm">
                  <span className="text-xs text-[#6B7280]">จำนวนที่ซื้อ</span>
                  <p className="font-semibold text-[#0B0B0B]">
                    {quantity} ชิ้น
                  </p>
                </div>
              )}
              {(state.remainingPoints ?? availablePoints) != null ? (
                <div className="space-y-1 text-sm">
                  <span className="text-xs text-[#6B7280]">฿ คงเหลือ</span>
                  <p className="font-medium text-[#0B0B0B]">
                    {(state.remainingPoints ?? availablePoints ?? 0).toLocaleString()} ฿
                  </p>
                </div>
              ) : null}
              {state.order.purchaseDate ? (
                <div className="space-y-1 text-sm">
                  <span className="text-xs text-[#6B7280]">เวลาทำรายการ</span>
                  <p className="font-medium text-[#0B0B0B]">
                    {new Date(state.order.purchaseDate).toLocaleString("th-TH", {
                      timeZone: "Asia/Bangkok",
                    })}
                  </p>
                </div>
              ) : null}

              {state.gifts && state.gifts.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#0B0B0B]">
                      ของแถม ({state.gifts.length.toLocaleString()} ชิ้น)
                    </p>
                    {state.gifts.length === 1 && (
                      <CopyButton
                        text={
                          state.gifts[0].giftProductDetails
                            ? state.gifts[0].giftProductDetails.replace(/<[^>]+>/g, "")
                            : `${state.gifts[0].giftAccountEmail ? `Email: ${state.gifts[0].giftAccountEmail}` : ""}\n${
                                state.gifts[0].giftAccountPassword ? `Pass: ${state.gifts[0].giftAccountPassword}` : ""
                              }`.trim()
                        }
                      />
                    )}
                  </div>
                  <div className="space-y-3">
                    {state.gifts.length === 1 ? (
                      <div className="rounded-xl border border-[#E5E7EB] bg-white p-3">
                        <div className="text-sm font-medium text-[#0B0B0B]">
                          {state.gifts[0].giftProductName}
                        </div>
                        <div className="mt-2 space-y-2">
                          {state.gifts[0].giftProductDetails ? (
                            <div className="rounded-lg bg-[#fff4ed] border border-[var(--theme-color)]/20 p-3 text-xs text-[#0B0B0B] break-all whitespace-pre-wrap font-mono leading-relaxed">
                              {state.gifts[0].giftProductDetails.replace(/<[^>]+>/g, "")}
                            </div>
                          ) : (state.gifts[0].giftAccountEmail || state.gifts[0].giftAccountPassword) ? (
                            <div className="grid gap-3 sm:grid-cols-2">
                              {state.gifts[0].giftAccountEmail && (
                                <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                                  <span className="text-xs text-[#6B7280]">Email</span>
                                  <p className="mt-1 font-mono text-sm font-medium text-[#0B0B0B] break-all">
                                    {state.gifts[0].giftAccountEmail}
                                  </p>
                                </div>
                              )}
                              {state.gifts[0].giftAccountPassword && (
                                <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                                  <span className="text-xs text-[#6B7280]">Password</span>
                                  <p className="mt-1 font-mono text-sm font-medium text-[#0B0B0B] break-all">
                                    {state.gifts[0].giftAccountPassword}
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-[#6B7280]">ไม่มีรายละเอียดของแถม</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-[#6B7280]">
                            รายละเอียดของแถมทั้งหมด ({state.gifts.length.toLocaleString()} ชิ้น)
                          </p>
                          <CopyButton
                            text={state.gifts
                              .map((g, idx) => {
                                const details =
                                  g.giftProductDetails ||
                                  (g.giftAccountEmail || g.giftAccountPassword
                                    ? `${g.giftAccountEmail ? `Email: ${g.giftAccountEmail}` : ""}\n${
                                        g.giftAccountPassword ? `Pass: ${g.giftAccountPassword}` : ""
                                      }`.trim()
                                    : "");
                                return `ของแถม #${idx + 1}\n${g.giftProductName}\n${details}`;
                              })
                              .join("\n\n---\n\n")}
                          />
                        </div>
                        <div className="space-y-2 max-h-72 overflow-auto">
                          {state.gifts.map((g, idx) => {
                            const hasDetails =
                              g.giftProductDetails || g.giftAccountEmail || g.giftAccountPassword;
                            return (
                              <div
                                key={`${g.giftProductTypeId}-${idx}`}
                                className="rounded-xl border border-[#E5E7EB] bg-white p-3 space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-semibold text-[var(--theme-color)]">
                                    ของแถม #{idx + 1}
                                  </p>
                                  <p className="text-xs text-[#6B7280]">{g.giftProductName}</p>
                                </div>
                                {hasDetails ? (
                                  <div className="rounded-lg bg-[#fff4ed] border border-[var(--theme-color)]/20 p-3 text-xs text-[#0B0B0B] break-all whitespace-pre-wrap font-mono leading-relaxed">
                                    {g.giftProductDetails
                                      ? g.giftProductDetails.replace(/<[^>]+>/g, "")
                                      : (
                                          <>
                                            {g.giftAccountEmail && <div>Email: {g.giftAccountEmail}</div>}
                                            {g.giftAccountPassword && (
                                              <div>Pass: {g.giftAccountPassword}</div>
                                            )}
                                          </>
                                        )}
                                  </div>
                                ) : (
                                  <p className="text-xs text-[#6B7280]">ไม่มีรายละเอียดของแถม</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
              {/* แสดงข้อมูลบัญชี: ถ้ามี orders หลายชิ้น แสดงทุกชิ้น, ถ้ามีชิ้นเดียวแสดงแบบเดิม */}
              {state.orders && state.orders.length > 1 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#0B0B0B]">รายละเอียดบัญชี ({state.orders.length} ชิ้น)</p>
                    <CopyButton 
                      text={state.orders.map((order, idx) => {
                        const details = order.productDetails || 
                          (order.accountEmail || order.accountPassword 
                            ? `${order.accountEmail ? `Email: ${order.accountEmail}` : ''}\n${order.accountPassword ? `Pass: ${order.accountPassword}` : ''}`.trim()
                            : '');
                        return `ไอดี #${idx + 1}\n${order.productName}\n${details}`;
                      }).join('\n\n---\n\n')} 
                    />
                  </div>
                  <div className="space-y-3 max-h-96 overflow-auto">
                    {state.orders.map((order, idx) => {
                      const hasDetails = order.productDetails || (order.accountEmail || order.accountPassword);
                      return (
                        <div key={order.id} className="rounded-xl border border-[var(--theme-color)]/30 bg-white p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-[var(--theme-color)]">ไอดี #{idx + 1}</p>
                            <p className="text-xs text-[#6B7280]">รหัส: {order.id.slice(0, 8)}</p>
                          </div>
                          {hasDetails && (
                            <div className="rounded-lg bg-[#fff4ed] border border-[var(--theme-color)]/20 p-3 text-xs text-[#0B0B0B] break-all whitespace-pre-wrap font-mono leading-relaxed">
                              {order.productDetails ? (
                                order.productDetails.replace(/<[^>]+>/g, '')
                              ) : (
                                <>
                                  {order.accountEmail && <div>Email: {order.accountEmail}</div>}
                                  {order.accountPassword && <div>Pass: {order.accountPassword}</div>}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (state.order.accountEmail || state.order.accountPassword) && !state.order.productDetails ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-[#0B0B0B]">รายละเอียดบัญชี</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {state.order.accountEmail && (
                      <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                        <span className="text-xs text-[#6B7280]">Email</span>
                        <p className="mt-1 font-mono text-sm font-medium text-[#0B0B0B] break-all">{state.order.accountEmail}</p>
                      </div>
                    )}
                    {state.order.accountPassword && (
                      <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                        <span className="text-xs text-[#6B7280]">Password</span>
                        <p className="mt-1 font-mono text-sm font-medium text-[#0B0B0B] break-all">{state.order.accountPassword}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : state.order.productDetails ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#0B0B0B]">รายละเอียดบัญชี</span>
                    <CopyButton text={state.order.productDetails.replace(/<[^>]+>/g, '')} />
                  </div>
                  <div 
                    className="max-h-56 overflow-auto rounded-2xl bg-[#fff4ed] border border-[var(--theme-color)]/20 p-4 text-xs text-[#0B0B0B] break-all whitespace-pre-wrap font-mono leading-relaxed"
                  >
                    {state.order.productDetails.replace(/<[^>]+>/g, '')}
                  </div>
                </div>
              ) : null}
              <div className="rounded-xl border border-dashed border-[var(--theme-color)]/40 bg-white p-3 text-xs text-[#6B7280]">
                หมายเลขอ้างอิง: <span className="font-semibold text-[var(--theme-color)]">{state.reference}</span>
              </div>
            </div>
            <DialogFooter>
              <button
                type="button"
                className="h-10 rounded-full bg-[var(--theme-color)] px-6 text-sm font-semibold text-white transition-colors hover:bg-[var(--theme-color)]"
                onClick={closeDialog}
              >
                ปิดหน้าต่าง
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-lg border border-[var(--theme-color)]/40 bg-white px-3 py-1.5 text-xs font-medium text-[var(--theme-color)] transition-colors hover:bg-[var(--theme-color)]/10 hover:border-[var(--theme-color)] active:bg-[var(--theme-color)]/20"
      type="button"
    >
      {copied ? (
        <>
          <Check className="size-3.5" />
          <span>คัดลอกแล้ว</span>
        </>
      ) : (
        <>
          <Copy className="size-3.5" />
          <span>คัดลอก</span>
        </>
      )}
    </button>
  );
}
