'use client'

import { useEffect, useState, useTransition, useRef } from 'react'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Search, Check, Save, Image as ImageIcon, X } from 'lucide-react'
import { toast } from 'sonner'
import { getMasterProductsData, saveProductSellingPrice, saveProductLocalImage, toggleMasterProductPublish } from '@/app/admin/products/actions'
import { MasterProduct } from '@/types/product'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { ADMIN_IMAGE_ACCEPT, uploadAdminImage } from '@/lib/admin/image-upload-client'

export default function MasterProductsTable() {
  const [masterProducts, setMasterProducts] = useState<MasterProduct[]>([])
  const [localPrices, setLocalPrices] = useState<Record<string, { price: number; imageUrl: string | null; isPublished?: boolean }>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  
  // Local state for tracking edited prices before saving
  const [editedPrices, setEditedPrices] = useState<Record<string, string>>({})
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, productId: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    startTransition(async () => {
      try {
        const imageUrl = await uploadAdminImage(file)
        const res = await saveProductLocalImage(productId, imageUrl)
        if (!res.success) {
          throw new Error(res.error || 'อัปโหลดรูปภาพไม่สำเร็จ')
        }

        toast.success('อัปโหลดรูปภาพสำเร็จ')
        setLocalPrices((prev) => ({
          ...prev,
          [productId]: {
            price: prev[productId]?.price || 0,
            imageUrl,
            isPublished: prev[productId]?.isPublished ?? true,
          },
        }))
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'อัปโหลดรูปภาพไม่สำเร็จ')
      }
    })
  }

  const handleRemoveImage = (productId: string) => {
    startTransition(async () => {
      try {
        const res = await saveProductLocalImage(productId, null)
        if (res.success) {
          toast.success('ลบรูปภาพที่ตั้งค่าเองสำเร็จ (กลับไปใช้รูปร้านหลัก)')
          setLocalPrices(prev => ({ 
            ...prev, 
            [productId]: { 
              ...prev[productId],
              price: prev[productId]?.price || 0, 
              imageUrl: null,
              isPublished: prev[productId]?.isPublished ?? true
            } 
          }))
        } else {
          toast.error(res.error || 'ลบรูปภาพไม่สำเร็จ')
        }
      } catch (err: any) {
        toast.error(err.message || 'ลบรูปภาพไม่สำเร็จ')
      }
    })
  }

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const res = await getMasterProductsData()
        if (res.success) {
          setMasterProducts(res.masterProducts || [])
          setLocalPrices(res.localPrices || {})
          
          // Initialize edited prices
          const initialPrices: Record<string, string> = {}
          if (res.masterProducts) {
            const safeLocalPrices = (res.localPrices || {}) as Record<string, { price: number; imageUrl: string | null }>;
            for (const p of res.masterProducts) {
              const lp = safeLocalPrices[p.id];
              initialPrices[p.id] = lp && lp.price != null ? lp.price.toString() : ''
            }
          }
          setEditedPrices(initialPrices)
        } else {
          toast.error(res.error || 'โหลดข้อมูลล้มเหลว')
        }
      } catch (err: any) {
        toast.error(err.message || 'โหลดข้อมูลล้มเหลว')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [])

  const filteredProducts = masterProducts.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handlePriceChange = (productId: string, value: string) => {
    setEditedPrices(prev => ({
      ...prev,
      [productId]: value
    }))
  }

  const handleSavePrice = async (productId: string) => {
    const priceStr = editedPrices[productId]
    if (!priceStr || isNaN(Number(priceStr)) || Number(priceStr) < 0) {
      toast.error('กรุณาระบุราคาขายให้ถูกต้อง')
      return
    }

    startTransition(async () => {
      try {
        const parsedPrice = Number(priceStr)
        const res = await saveProductSellingPrice(productId, parsedPrice)
        if (res.success) {
          toast.success('บันทึกราคาขายเรียบร้อย')
          setLocalPrices(prev => ({ 
            ...prev, 
            [productId]: { 
              price: parsedPrice,
              imageUrl: prev[productId]?.imageUrl || null,
              isPublished: prev[productId]?.isPublished ?? true
            } 
          }))
        } else {
          toast.error(res.error || 'บันทึกราคาไม่สำเร็จ')
        }
      } catch (err: any) {
        toast.error(err.message || 'บันทึกราคาไม่สำเร็จ')
      }
    })
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--theme-color)]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-2">
        <Search className="h-4 w-4 text-[#6B7280]" />
        <Input
          placeholder="ค้นหาสินค้าจากร้านหลัก..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
      </div>

      <div className="rounded-lg border border-[#E5E7EB] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F9FAFB] text-[#6B7280]">
              <tr>
                <th className="px-4 py-3 font-medium">สินค้า (Master Product)</th>
                <th className="px-4 py-3 font-medium text-center">ราคาทุน</th>
                <th className="px-4 py-3 font-medium">ราคาขายหน้าร้าน</th>
                <th className="px-4 py-3 font-medium text-center">แสดงหน้าร้าน</th>
                <th className="px-4 py-3 font-medium text-center">กำไรต่อชิ้น</th>
                <th className="px-4 py-3 font-medium text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#6B7280]">
                    ไม่พบสินค้าร้านหลัก หรือยังไม่ได้เชื่อมต่อ API Key
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  // Prioritize 'price' (which should be the price assigned by Master for this API key tier) over 'cost_price'
                  const rawCostPrice = (product as any).price ?? (product as any).cost_price ?? product.cost_price ?? 0
                  const costPrice = Number(rawCostPrice)
                  
                  const savedData = localPrices[product.id]
                  const savedPrice = savedData?.price
                  const savedImageUrl = savedData?.imageUrl
                  
                  const currentInput = editedPrices[product.id] || ''
                  const parsedInput = parseFloat(currentInput)
                  const profit = !isNaN(parsedInput) ? parsedInput - costPrice : (savedPrice != null ? savedPrice - costPrice : null)
                  const hasChanged = savedPrice == null ? currentInput !== '' : Number(currentInput) !== savedPrice
                  const imageSrc = savedImageUrl || (product as any).image_url || (product as any).imageUrl || null

                  return (
                    <tr key={product.id} className="transition-colors hover:bg-[#F9FAFB]/50">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <div className="group relative flex size-16 items-center justify-center overflow-hidden rounded-lg bg-gray-100 shrink-0 border border-gray-200">
                            {imageSrc ? (
                              <Image
                                src={imageSrc}
                                alt={product.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <ImageIcon className="size-6 text-gray-400" />
                            )}
                            
                            {/* Overlay Edit Button */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="size-6 h-6 w-6 text-white hover:bg-white/20 hover:text-white"
                                onClick={() => fileInputRefs.current[product.id]?.click()}
                                disabled={isPending}
                                title="เปลี่ยนรูปภาพ"
                              >
                                <ImageIcon className="size-4" />
                              </Button>
                              {savedImageUrl && (
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="size-6 h-6 w-6 text-white hover:bg-red-500/80 hover:text-white"
                                  onClick={() => handleRemoveImage(product.id)}
                                  disabled={isPending}
                                  title="ใช้รูปจากร้านหลัก"
                                >
                                  <X className="size-4" />
                                </Button>
                              )}
                            </div>
                            <input 
                              type="file" 
                              accept={ADMIN_IMAGE_ACCEPT}
                              className="hidden" 
                              ref={el => { fileInputRefs.current[product.id] = el }}
                              onChange={(e) => handleImageUpload(e, product.id)}
                            />
                          </div>
                          <div className="pt-1">
                            <div className="font-semibold text-[#0B0B0B] flex items-center gap-2">
                              {product.name}
                              {savedImageUrl && (
                                <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-normal">Custom Image</span>
                              )}
                            </div>
                            <div className="text-xs text-[#6B7280] truncate max-w-[200px] mt-0.5">
                              {product.description || 'ไม่มีรายละเอียด'}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-7 px-2 text-xs"
                                onClick={() => fileInputRefs.current[product.id]?.click()}
                                disabled={isPending}
                              >
                                เปลี่ยนรูปภาพ
                              </Button>
                              {savedImageUrl && (
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleRemoveImage(product.id)}
                                  disabled={isPending}
                                >
                                  ลบรูป
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                          ฿{costPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative max-w-[120px]">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#6B7280]">
                            ฿
                          </span>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0.00"
                            value={currentInput}
                            onChange={(e) => handlePriceChange(product.id, e.target.value)}
                            className="pl-8 text-right font-medium text-[#0B0B0B]"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center">
                          <Switch 
                            checked={savedData?.isPublished ?? true}
                            disabled={isPending || savedPrice == null}
                            onCheckedChange={(checked) => {
                              startTransition(async () => {
                                const res = await toggleMasterProductPublish(product.id, checked)
                                if (res.success) {
                                  toast.success(checked ? 'เปิดแสดงสินค้านี้หน้าร้านแล้ว' : 'ซ่อนสินค้านี้จากหน้าร้านแล้ว')
                                  setLocalPrices(prev => ({
                                    ...prev,
                                    [product.id]: {
                                      ...prev[product.id],
                                      price: prev[product.id]?.price || 0,
                                      imageUrl: prev[product.id]?.imageUrl || null,
                                      isPublished: checked
                                    }
                                  }))
                                } else {
                                  toast.error('ไม่สามารถเปลี่ยนสถานะได้')
                                }
                              })
                            }}
                          />
                        </div>
                        {savedPrice == null && (
                          <div className="text-[10px] text-gray-400 mt-1">ต้องตั้งราคาก่อน</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {profit !== null ? (
                          <span className={cn(
                            "font-semibold",
                            profit > 0 ? "text-emerald-600" : profit < 0 ? "text-red-600" : "text-gray-500"
                          )}>
                            {profit > 0 ? '+' : ''}{profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant={hasChanged ? 'default' : 'outline'}
                          className={cn(
                            hasChanged 
                              ? 'bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)]/90 shadow-md shadow-[var(--theme-color)]/20' 
                              : 'text-gray-500 hover:text-gray-700'
                          )}
                          disabled={!hasChanged || isPending}
                          onClick={() => handleSavePrice(product.id)}
                        >
                          {isPending ? <Loader2 className="size-4 animate-spin" /> : hasChanged ? <Save className="mr-1 size-4" /> : <Check className="mr-1 size-4" />}
                          {hasChanged ? 'บันทึก' : 'บันทึกแล้ว'}
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
