"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Gift, Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

type ProductLite = {
  typeId: string;
  name: string;
  stock: number | null;
  apiProviderId: string | null;
};

type GiftRuleRow = {
  id: string;
  baseProductTypeId: string;
  giftProductTypeId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  baseProductName: string;
  giftProductName: string;
  giftProductStock: number | null;
  giftIsExternal: boolean;
};

export default function GiftRulesTable() {
  const [isPending, startTransition] = useTransition();
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [rules, setRules] = useState<GiftRuleRow[]>([]);

  const [baseTypeId, setBaseTypeId] = useState<string>("");
  const [giftTypeId, setGiftTypeId] = useState<string>("");

  const fetchAll = () => {
    startTransition(async () => {
      const res = await fetch("/api/admin/gifts/rules", { credentials: "include" });
      if (!res.ok) {
        toast.error("โหลดข้อมูลของแถมไม่สำเร็จ");
        return;
      }
      const data = (await res.json()) as { rules: GiftRuleRow[]; products: ProductLite[] };
      setRules(data.rules ?? []);
      setProducts(data.products ?? []);
    });
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const productOptions = useMemo(() => {
    return [...products].sort((a, b) => a.name.localeCompare(b.name, "th"));
  }, [products]);

  const giftOptions = useMemo(() => {
    // ของแถม: แนะนำให้เป็น manual product (ไม่มี apiProviderId)
    return productOptions
      .filter((p) => !p.apiProviderId)
      .filter((p) => p.typeId !== baseTypeId);
  }, [productOptions, baseTypeId]);

  const addRule = async () => {
    if (!baseTypeId || !giftTypeId) {
      toast.error("กรุณาเลือกสินค้าแม่และของแถม");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/admin/gifts/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ baseTypeId, giftTypeId }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { message?: string };
        toast.error(payload.message ?? "เพิ่มของแถมไม่สำเร็จ");
        return;
      }
      toast.success("เพิ่มของแถมสำเร็จ");
      setGiftTypeId("");
      fetchAll();
    });
  };

  const toggleRule = async (id: string, isActive: boolean) => {
    startTransition(async () => {
      const res = await fetch("/api/admin/gifts/rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, isActive }),
      });
      if (!res.ok) {
        toast.error("อัปเดตสถานะไม่สำเร็จ");
        return;
      }
      setRules((prev) => prev.map((r) => (r.id === id ? { ...r, isActive } : r)));
    });
  };

  const removeRule = async (id: string) => {
    startTransition(async () => {
      const res = await fetch(`/api/admin/gifts/rules?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        toast.error("ลบของแถมไม่สำเร็จ");
        return;
      }
      toast.success("ลบของแถมสำเร็จ");
      setRules((prev) => prev.filter((r) => r.id !== id));
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border border-[#E5E7EB] bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="size-4 text-[var(--theme-color)]" />
            ตั้งค่าของแถม
          </CardTitle>
          <p className="text-xs text-[#6B7280]">
            กำหนดว่า “ซื้อสินค้าแม่” แล้วสามารถเลือก “ของแถม” จากสินค้าในร้านได้ (แนะนำให้ใช้สินค้าที่เป็น Manual เท่านั้น)
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>สินค้าแม่</Label>
              <Select value={baseTypeId} onValueChange={(v) => setBaseTypeId(v)}>
                <SelectTrigger className="bg-white border-[#E5E7EB]">
                  <SelectValue placeholder="เลือกสินค้าแม่" />
                </SelectTrigger>
                <SelectContent>
                  {productOptions.map((p) => (
                    <SelectItem key={p.typeId} value={p.typeId}>
                      {p.name} ({p.typeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ของแถม</Label>
              <Select value={giftTypeId} onValueChange={(v) => setGiftTypeId(v)} disabled={!baseTypeId}>
                <SelectTrigger className="bg-white border-[#E5E7EB]">
                  <SelectValue placeholder={baseTypeId ? "เลือกของแถม" : "เลือกสินค้าแม่ก่อน"} />
                </SelectTrigger>
                <SelectContent>
                  {giftOptions.map((p) => (
                    <SelectItem key={p.typeId} value={p.typeId}>
                      {p.name} ({p.typeId}){typeof p.stock === "number" ? ` • stock ${p.stock}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={addRule}
                disabled={isPending || !baseTypeId || !giftTypeId}
                className="w-full bg-[var(--theme-color)] hover:bg-[var(--theme-color)]"
              >
                {isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 size-4" />
                )}
                เพิ่มของแถม
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-[#E5E7EB] bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">รายการกติกาของแถม</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="w-full overflow-x-auto rounded-lg border border-[#E5E7EB]">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[240px]">สินค้าแม่</TableHead>
                  <TableHead className="min-w-[240px]">ของแถม</TableHead>
                  <TableHead className="min-w-[120px] text-right">สต็อกของแถม</TableHead>
                  <TableHead className="min-w-[100px] text-center">เปิดใช้</TableHead>
                  <TableHead className="min-w-[80px] text-right">ลบ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-[#6B7280]">
                      {isPending ? "กำลังโหลด..." : "ยังไม่มีการตั้งค่าของแถม"}
                    </TableCell>
                  </TableRow>
                ) : (
                  rules.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-[#0B0B0B]">
                        {r.baseProductName}
                        <div className="text-xs text-[#6B7280]">{r.baseProductTypeId}</div>
                      </TableCell>
                      <TableCell className="text-[#0B0B0B]">
                        {r.giftProductName}
                        <div className="text-xs text-[#6B7280]">{r.giftProductTypeId}</div>
                        {r.giftIsExternal ? (
                          <div className="mt-1 text-xs text-amber-600">
                            ของแถมนี้เป็น External API (ไม่แนะนำ)
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">
                        {typeof r.giftProductStock === "number"
                          ? r.giftProductStock.toLocaleString("th-TH")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={r.isActive}
                          onCheckedChange={(checked) => toggleRule(r.id, checked)}
                          disabled={isPending}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          className="border-[#E5E7EB] bg-white"
                          onClick={() => removeRule(r.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="size-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


