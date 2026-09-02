"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { normalizeNewlines } from "@/lib/utils";

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

function formatPrice(value: number | null) {
  if (value == null) return "-";
  return `${value.toLocaleString()} ฿`;
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
      <span className="text-xs text-[#6B7280]">{label}</span>
      <span className="font-medium text-[#0B0B0B]">{value}</span>
    </div>
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

export function OrderDetailsDialog({
  productName,
  productDetails,
  accountEmail,
  accountPassword,
  reference,
  price,
  purchaseDate,
}: {
  productName: string;
  productDetails: string;
  accountEmail: string | null;
  accountPassword: string | null;
  reference: string;
  price: number | null;
  purchaseDate: string | null;
}) {
  const normalizedProductDetails = normalizeNewlines(productDetails);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full sm:w-auto rounded-full border-[var(--theme-color)]/40 text-[var(--theme-color)] hover:border-[var(--theme-color)] hover:bg-[var(--theme-color)]/10 hover:text-[var(--theme-color)]"
        >
          ดูรายละเอียด
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-white w-[95vw] overflow-x-hidden mx-4 sm:mx-auto md:w-full">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#0B0B0B]">
            รายละเอียดคำสั่งซื้อ
          </DialogTitle>
          <DialogDescription className="text-sm text-[#6B7280] whitespace-pre-line">
            {normalizeNewlines(productName)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoBlock label="หมายเลขอ้างอิง" value={reference} />
            <InfoBlock label="วันที่สั่งซื้อ" value={formatDate(purchaseDate)} />
            <InfoBlock label="฿ ที่ใช้" value={formatPrice(price)} />
          </div>
          {/* แสดงข้อมูลบัญชี: ถ้ามี email/password แยกกัน แสดงแบบสั้น, ถ้ามี productDetails แสดงแบบยาว */}
          {(accountEmail || accountPassword) && !productDetails ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[#0B0B0B]">รายละเอียดบัญชี</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {accountEmail && (
                  <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                    <span className="text-xs text-[#6B7280]">Email</span>
                    <p className="mt-1 font-mono text-sm font-medium text-[#0B0B0B] break-all">{accountEmail}</p>
                  </div>
                )}
                {accountPassword && (
                  <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                    <span className="text-xs text-[#6B7280]">Password</span>
                    <p className="mt-1 font-mono text-sm font-medium text-[#0B0B0B] break-all">{accountPassword}</p>
                  </div>
                )}
              </div>
            </div>
          ) : productDetails ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#0B0B0B]">รายละเอียดบัญชี</p>
                <CopyButton text={normalizedProductDetails} />
              </div>
              <div 
                className="max-h-96 overflow-auto rounded-2xl bg-[#fff4ed] border border-[var(--theme-color)]/20 p-4 text-xs text-[#0B0B0B] break-all whitespace-pre-wrap font-mono leading-relaxed"
              >
                {normalizedProductDetails}
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

