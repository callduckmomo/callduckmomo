"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Key, RefreshCw, Wallet } from "lucide-react";
import type { ApiProvider } from "@/lib/api-providers/types";

type ProviderBalance = {
  providerId: string;
  balance: string | null;
  error: string | null;
  isLoading: boolean;
};

export default function ApiProvidersTable() {
  const [providers, setProviders] = useState<ApiProvider[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ApiProvider | null>(null);
  const [balances, setBalances] = useState<Map<string, ProviderBalance>>(new Map());
  const [formData, setFormData] = useState({
    name: "",
    displayName: "",
    apiKey: "",
    apiEndpoint: "",
    productEndpoint: "",
    buyEndpoint: "",
    historyEndpoint: "",
    isActive: true,
  });

  const fetchProviders = () => {
    startTransition(async () => {
      const res = await fetch("/api/admin/api-providers", { credentials: "include" });
      if (!res.ok) {
        toast.error("โหลดข้อมูลไม่สำเร็จ");
        return;
      }
      const data = (await res.json()) as { providers: ApiProvider[] };
      setProviders(data.providers);
    });
  };

  const fetchBalance = async (providerId: string) => {
    setBalances((prev) => {
      const newMap = new Map(prev);
      newMap.set(providerId, { providerId, balance: null, error: null, isLoading: true });
      return newMap;
    });

    try {
      const res = await fetch(`/api/admin/api-providers/balance?providerId=${providerId}`, {
        credentials: "include",
      });
      const data = (await res.json()) as {
        providerId: string;
        balance: string | null;
        error: string | null;
      };

      setBalances((prev) => {
        const newMap = new Map(prev);
        newMap.set(providerId, {
          providerId,
          balance: data.balance,
          error: data.error,
          isLoading: false,
        });
        return newMap;
      });
    } catch (error) {
      setBalances((prev) => {
        const newMap = new Map(prev);
        newMap.set(providerId, {
          providerId,
          balance: null,
          error: "เกิดข้อผิดพลาด",
          isLoading: false,
        });
        return newMap;
      });
    }
  };

  const fetchAllBalances = () => {
    providers.forEach((provider) => {
      if (provider.apiKey && provider.isActive) {
        fetchBalance(provider.id);
      }
    });
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  useEffect(() => {
    if (providers.length > 0) {
      fetchAllBalances();
    }
  }, [providers.length]);

  const resetForm = () => {
    setFormData({
      name: "",
      displayName: "",
      apiKey: "",
      apiEndpoint: "",
      productEndpoint: "",
      buyEndpoint: "",
      historyEndpoint: "",
      isActive: true,
    });
    setEditingProvider(null);
  };

  const handleOpenDialog = (provider?: ApiProvider) => {
    if (provider) {
      setEditingProvider(provider);
      setFormData({
        name: provider.name,
        displayName: provider.displayName,
        apiKey: provider.apiKey || "",
        apiEndpoint: provider.apiEndpoint,
        productEndpoint: provider.productEndpoint || "",
        buyEndpoint: provider.buyEndpoint || "",
        historyEndpoint: provider.historyEndpoint || "",
        isActive: provider.isActive,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.displayName.trim() || !formData.apiEndpoint.trim()) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    startTransition(async () => {
      try {
        if (editingProvider) {
          // Update - only send apiKey if it's been changed (non-empty)
          const updatePayload: Record<string, unknown> = {
            id: editingProvider.id,
            displayName: formData.displayName,
            apiEndpoint: formData.apiEndpoint,
            productEndpoint: formData.productEndpoint || null,
            buyEndpoint: formData.buyEndpoint || null,
            historyEndpoint: formData.historyEndpoint || null,
            isActive: formData.isActive,
          };
          
          // Only update API key if a new value is provided
          // If empty string, don't include in payload to keep existing key
          if (formData.apiKey && formData.apiKey.trim()) {
            updatePayload.apiKey = formData.apiKey.trim();
          }
          
          const res = await fetch("/api/admin/api-providers", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(updatePayload),
          });

          if (!res.ok) {
            const payload = await res.json().catch(() => null);
            toast.error(payload?.message ?? "ไม่สามารถอัปเดต API provider ได้");
            return;
          }

          toast.success("อัปเดต API provider สำเร็จ");
        } else {
          // Create
          const res = await fetch("/api/admin/api-providers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(formData),
          });

          if (!res.ok) {
            const payload = await res.json().catch(() => null);
            toast.error(payload?.message ?? "ไม่สามารถสร้าง API provider ได้");
            return;
          }

          toast.success("สร้าง API provider สำเร็จ");
        }

        setIsDialogOpen(false);
        resetForm();
        fetchProviders();
      } catch (error) {
        console.error("Save error:", error);
        toast.error("เกิดข้อผิดพลาด");
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบ API provider นี้?")) {
      return;
    }

    startTransition(async () => {
      const res = await fetch(`/api/admin/api-providers?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        toast.error(payload?.message ?? "ไม่สามารถลบ API provider ได้");
        return;
      }

      toast.success("ลบ API provider สำเร็จ");
      fetchProviders();
    });
  };

  const handleToggleActive = async (provider: ApiProvider) => {
    startTransition(async () => {
      const res = await fetch("/api/admin/api-providers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: provider.id,
          isActive: !provider.isActive,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        toast.error(payload?.message ?? "ไม่สามารถอัปเดตสถานะได้");
        return;
      }

      toast.success("อัปเดตสถานะสำเร็จ");
      fetchProviders();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#0B0B0B]">จัดการ API Providers</h3>
          <p className="text-sm text-[#6B7280]">ตั้งค่าและจัดการ API providers สำหรับดึงสินค้า</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAllBalances}
            disabled={isPending || providers.length === 0}
            className="border-[#E5E7EB]"
          >
            <RefreshCw className="mr-2 size-4" />
            รีเฟรชยอดเงิน
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)]"
            >
              <Plus className="mr-2 size-4" />
              เพิ่ม API Provider
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingProvider ? "แก้ไข API Provider" : "เพิ่ม API Provider"}
              </DialogTitle>
              <DialogDescription>
                ตั้งค่าข้อมูล API provider สำหรับดึงสินค้าและจัดการคำสั่งซื้อ
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="name">ชื่อ API Provider *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="gafiwshop"
                  disabled={!!editingProvider}
                  className="border-[#E5E7EB]"
                />
                <p className="text-xs text-[#6B7280]">ชื่อต้องไม่ซ้ำกันและไม่สามารถแก้ไขได้</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">ชื่อแสดง *</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="GafiwShop API"
                  className="border-[#E5E7EB]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type="password"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    placeholder="กรอก API key"
                    className="border-[#E5E7EB] pr-10"
                  />
                  <Key className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#6B7280]" />
                </div>
                <p className="text-xs text-[#6B7280]">
                  {editingProvider
                    ? "เว้นว่างไว้หากไม่ต้องการเปลี่ยน API key (API key เดิมจะยังคงอยู่)"
                    : "API key สำหรับเรียกใช้ API"}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiEndpoint">API Endpoint *</Label>
                <Input
                  id="apiEndpoint"
                  value={formData.apiEndpoint}
                  onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
                  placeholder="https://api.example.com"
                  className="border-[#E5E7EB]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="productEndpoint">Product Endpoint</Label>
                <Input
                  id="productEndpoint"
                  value={formData.productEndpoint}
                  onChange={(e) => setFormData({ ...formData, productEndpoint: e.target.value })}
                  placeholder="https://api.example.com/api_product"
                  className="border-[#E5E7EB]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyEndpoint">Buy Endpoint</Label>
                <Input
                  id="buyEndpoint"
                  value={formData.buyEndpoint}
                  onChange={(e) => setFormData({ ...formData, buyEndpoint: e.target.value })}
                  placeholder="https://api.example.com/api_buy"
                  className="border-[#E5E7EB]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="historyEndpoint">History Endpoint</Label>
                <Input
                  id="historyEndpoint"
                  value={formData.historyEndpoint}
                  onChange={(e) => setFormData({ ...formData, historyEndpoint: e.target.value })}
                  placeholder="https://api.example.com/api_history"
                  className="border-[#E5E7EB]"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">ใช้งานได้</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button
                onClick={handleSave}
                disabled={isPending}
                className="bg-[var(--theme-color)] hover:bg-[var(--theme-color)]"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  "บันทึก"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="rounded-lg border border-[#E5E7EB] bg-white">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อแสดง</TableHead>
              <TableHead>API Endpoint</TableHead>
              <TableHead>ยอดเงินคงเหลือ</TableHead>
              <TableHead>Endpoints</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && providers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="mx-auto size-6 animate-spin text-[var(--theme-color)]" />
                </TableCell>
              </TableRow>
            ) : providers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-[#6B7280]">
                  ไม่มี API providers
                </TableCell>
              </TableRow>
            ) : (
              providers.map((provider) => {
                const balanceInfo = balances.get(provider.id);
                return (
                  <TableRow key={provider.id} className="hover:bg-[#F9FAFB]">
                    <TableCell className="font-medium">{provider.displayName}</TableCell>
                    <TableCell className="text-sm text-[#6B7280]">{provider.apiEndpoint}</TableCell>
                    <TableCell>
                      {provider.apiKey ? (
                        <div className="flex items-center gap-2">
                          {balanceInfo?.isLoading ? (
                            <Loader2 className="size-4 animate-spin text-[#6B7280]" />
                          ) : balanceInfo?.balance !== null && balanceInfo?.balance !== undefined ? (
                            <div className="flex items-center gap-1.5">
                              <Wallet className="size-4 text-[var(--theme-color)]" />
                              <span className="text-sm font-semibold text-[#0B0B0B]">
                                {parseFloat(balanceInfo.balance).toLocaleString("th-TH", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}{" "}
                                บาท
                              </span>
                            </div>
                          ) : balanceInfo?.error ? (
                            <span className="text-xs text-[#DC2626]">{balanceInfo.error}</span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => fetchBalance(provider.id)}
                              className="h-7 text-xs"
                            >
                              <RefreshCw className="mr-1 size-3" />
                              ตรวจสอบ
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-[#6B7280]">ไม่มี API key</span>
                      )}
                    </TableCell>
                    <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {provider.productEndpoint && (
                        <Badge variant="outline" className="text-xs">
                          Product
                        </Badge>
                      )}
                      {provider.buyEndpoint && (
                        <Badge variant="outline" className="text-xs">
                          Buy
                        </Badge>
                      )}
                      {provider.historyEndpoint && (
                        <Badge variant="outline" className="text-xs">
                          History
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={provider.isActive}
                        onCheckedChange={() => handleToggleActive(provider)}
                        disabled={isPending}
                      />
                      <Badge
                        className={
                          provider.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {provider.isActive ? "ใช้งาน" : "ปิดใช้งาน"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(provider)}
                        disabled={isPending}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(provider.id)}
                        disabled={isPending}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

