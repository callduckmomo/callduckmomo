'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { cn, normalizeNewlines } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Edit, Check, Package } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ADMIN_IMAGE_ACCEPT, uploadAdminImage } from '@/lib/admin/image-upload-client'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type ProductRow = {
  id: string
  typeId: string
  name: string
  imageUrl: string | null
  details: string | null
  price: number | null
  priceVip: number | null
  costPrice: number | null
  priceWalkin: number | null
  stock: number | null
  typeMenu: string | null
  categoryId: string | null
  isPublished: boolean
  badge: 'hot_sale' | 'recommended' | null
  createdAt: string
  updatedAt: string
}

type Category = {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  displayOrder: number
  isActive: boolean
}

export default function LocalProductsTable() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [isPending, startTransition] = useTransition()
  const [, startSavingTransition] = useTransition()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด')
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({})
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({})

  const isChildSite = process.env.NEXT_PUBLIC_SITE_ID !== 'main' && !!process.env.NEXT_PUBLIC_SITE_ID
  const [priceVipDrafts, setPriceVipDrafts] = useState<Record<string, string>>({})
  const [costPriceDrafts, setCostPriceDrafts] = useState<Record<string, string>>({})
  const [priceWalkinDrafts, setPriceWalkinDrafts] = useState<Record<string, string>>({})
  const [savingPriceId, setSavingPriceId] = useState<string | null>(null)
  const [savingStockId, setSavingStockId] = useState<string | null>(null)
  const [savingPriceVipId, setSavingPriceVipId] = useState<string | null>(null)
  const [savingCostPriceId, setSavingCostPriceId] = useState<string | null>(null)
  const [savingPriceWalkinId, setSavingPriceWalkinId] = useState<string | null>(null)
  const [isApplyingProfit, setIsApplyingProfit] = useState(false)
  const [isAmountDialogOpen, setIsAmountDialogOpen] = useState(false)
  const [isPercentDialogOpen, setIsPercentDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [productFormData, setProductFormData] = useState({
    typeId: '',
    name: '',
    imageUrl: '',
    details: '',
    price: '',
    priceVip: '',
    costPrice: '',
    priceWalkin: '',
    stock: '',
    categoryId: '',
    accountEmail: '',
    accountPassword: '',
    isPublished: false,
    badge: null as 'hot_sale' | 'recommended' | null,
    newCategoryName: '',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)
  const [bulkPublishDialogOpen, setBulkPublishDialogOpen] = useState(false)
  const [bulkPublishAction, setBulkPublishAction] = useState<boolean | null>(null)
  const [bulkPublishOnlyWithStock, setBulkPublishOnlyWithStock] = useState(false)
  const [allCategories, setAllCategories] = useState<Array<{ category: string; imageUrl: string | null }>>([])
  const itemsPerPage = 50

  const handleFileChange = async (file: File) => {
    if (!file) return
    try {
      const imageUrl = await uploadAdminImage(file)
      setProductFormData((prev) => ({ ...prev, imageUrl }))
      toast.success('อัปโหลดรูปภาพสำเร็จ')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'อัปโหลดรูปภาพไม่สำเร็จ')
    }
  }

  const fetchProducts = (page = 1) => {
    startTransition(async () => {
      const params = new URLSearchParams({
        pagination: 'true',
        page: String(page),
        limit: String(itemsPerPage),
      })
      
      // Add category filter if not "ทั้งหมด"
      if (selectedCategory && selectedCategory !== 'ทั้งหมด') {
        params.append('category', selectedCategory)
      }
      
      // Add search filter if exists
      if (searchTerm && searchTerm.trim()) {
        params.append('search', searchTerm.trim())
      }
      params.append('isLocal', 'true')
      
      const res = await fetch(
        `/api/admin/products?${params.toString()}`,
        { credentials: 'include' }
      )
      if (!res.ok) {
        toast.error('โหลดรายการสินค้าไม่สำเร็จ')
        return
      }
      const data = (await res.json()) as {
        products: ProductRow[]
        total: number
        page: number
        totalPages: number
        categories?: Array<{ category: string; imageUrl: string | null }>
      }
      setProducts(data.products)
      setTotal(data.total)
      setTotalPages(data.totalPages)
      setCurrentPage(data.page)
      
      // Update categories from API response (all categories, not just current page)
      if (data.categories) {
        setAllCategories(data.categories)
      }
      
      // Merge drafts: only set initial value for products NOT currently being edited
      setPriceDrafts((prev) => {
        const next = { ...prev }
        data.products.forEach((p) => { if (!(p.id in prev)) next[p.id] = p.price != null ? String(p.price) : '' })
        return next
      })
      setPriceVipDrafts((prev) => {
        const next = { ...prev }
        data.products.forEach((p) => { if (!(p.id in prev)) next[p.id] = p.priceVip != null ? String(p.priceVip) : '' })
        return next
      })
      setCostPriceDrafts((prev) => {
        const next = { ...prev }
        data.products.forEach((p) => { if (!(p.id in prev)) next[p.id] = p.costPrice != null ? String(p.costPrice) : '' })
        return next
      })
      setPriceWalkinDrafts((prev) => {
        const next = { ...prev }
        data.products.forEach((p) => { if (!(p.id in prev)) next[p.id] = p.priceWalkin != null ? String(p.priceWalkin) : '' })
        return next
      })
    })
  }

  // Reset to page 1 and clear products when category or search changes
  useEffect(() => {
    setCurrentPage(1);
    // Clear products immediately for better UX
    setProducts([]);
    // fetchProducts will be called by the currentPage useEffect
  }, [selectedCategory, searchTerm]);

  // Fetch products when page, category, or search changes
  useEffect(() => {
    fetchProducts(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedCategory, searchTerm]);


  useEffect(() => {
    // Fetch categories
    fetch('/api/admin/categories?isLocal=true', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.categories) {
          setCategories(data.categories.filter((c: Category) => c.isActive))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const amountBtn = document.getElementById('product-profit-amount-btn')
    const percentBtn = document.getElementById('product-profit-percent-btn')

    const handleAmountClick = () => setIsAmountDialogOpen(true)
    const handlePercentClick = () => setIsPercentDialogOpen(true)

    amountBtn?.addEventListener('click', handleAmountClick)
    percentBtn?.addEventListener('click', handlePercentClick)

    return () => {
      amountBtn?.removeEventListener('click', handleAmountClick)
      percentBtn?.removeEventListener('click', handlePercentClick)
    }
  }, [])

  const handleTogglePublish = (product: ProductRow, value: boolean) => {
    startTransition(async () => {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ typeId: product.typeId, isPublished: value, isLocal: true }),
      })

      if (!res.ok) {
        toast.error('อัปเดตสถานะเผยแพร่ไม่สำเร็จ')
        return
      }

      toast.success(`ตั้งค่าสินค้า ${value ? 'เผยแพร่' : 'ซ่อน'} เรียบร้อย`)
      setProducts((prev) =>
        prev.map((item) =>
          item.id === product.id
            ? {
                ...item,
                isPublished: value,
              }
            : item
        )
      )
    })
  }

  const handleUpdateBadge = (product: ProductRow, badge: 'hot_sale' | 'recommended' | null) => {
    startTransition(async () => {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ typeId: product.typeId, badge, isLocal: true }),
      })

      if (!res.ok) {
        toast.error('อัปเดต badge ไม่สำเร็จ')
        return
      }

      const badgeText = badge === 'hot_sale' ? 'Hot Sale' : badge === 'recommended' ? 'แนะนำ' : 'ไม่มี badge'
      toast.success(`ตั้งค่า badge เป็น "${badgeText}" เรียบร้อย`)
      setProducts((prev) =>
        prev.map((item) =>
          item.id === product.id
            ? {
                ...item,
                badge,
              }
            : item
        )
      )
    })
  }

  const handleBulkPublishClick = (isPublished: boolean) => {
    setBulkPublishAction(isPublished)
    setBulkPublishOnlyWithStock(false)
    setBulkPublishDialogOpen(true)
  }

  const handleBulkPublishConfirm = async () => {
    if (bulkPublishAction === null) return

    setIsBulkUpdating(true)
    setBulkPublishDialogOpen(false)
    
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          bulkPublish: bulkPublishAction,
          onlyWithStock: bulkPublishOnlyWithStock,
          isLocal: true,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.message ?? 'อัปเดตสถานะเผยแพร่ไม่สำเร็จ')
        return
      }

      const data = await res.json() as { count: number; message: string }
      toast.success(data.message || `อัปเดตสถานะเผยแพร่ ${data.count} รายการสำเร็จ`)
      
      // Refresh current page
      fetchProducts(currentPage)
    } catch (error) {
      console.error('Bulk publish error:', error)
      toast.error('อัปเดตสถานะเผยแพร่ไม่สำเร็จ')
    } finally {
      setIsBulkUpdating(false)
      setBulkPublishAction(null)
      setBulkPublishOnlyWithStock(false)
    }
  }

  const handlePriceDraftChange = (id: string, value: string) => {
    if (/^\d*(\.\d{0,2})?$/.test(value)) {
      setPriceDrafts((prev) => ({ ...prev, [id]: value }))
    }
  }

  const handleStockDraftChange = (id: string, value: string) => {
    if (!/^\d*$/.test(value)) return
    setStockDrafts(prev => ({ ...prev, [id]: value }))
  }

  const handleSaveStock = async (product: ProductRow) => {
    const draft = stockDrafts[product.id]?.trim()
    if (!draft) return
    const numeric = parseInt(draft, 10)
    if (isNaN(numeric)) return

    setSavingStockId(product.id)
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ typeId: product.typeId, stock: numeric, isLocal: true }),
      })

      if (!res.ok) {
        throw new Error('บันทึกสต๊อกไม่สำเร็จ')
      }

      toast.success('อัปเดตสต๊อกเรียบร้อย')
      fetchProducts(currentPage)
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการบันทึกสต๊อก')
    } finally {
      setSavingStockId(null)
    }
  }
  const handlePriceVipDraftChange = (id: string, value: string) => {
    if (/^\d*(\.\d{0,2})?$/.test(value)) {
      setPriceVipDrafts((prev) => ({ ...prev, [id]: value }))
    }
  }

  const handleCostPriceDraftChange = (id: string, value: string) => {
    if (/^\d*(\.\d{0,2})?$/.test(value)) {
      setCostPriceDrafts((prev) => ({ ...prev, [id]: value }))
    }
  }

  const handlePriceWalkinDraftChange = (id: string, value: string) => {
    if (/^\d*(\.\d{0,2})?$/.test(value)) {
      setPriceWalkinDrafts((prev) => ({ ...prev, [id]: value }))
    }
  }

  const handleSavePrice = (product: ProductRow) => {
    const draft = priceDrafts[product.id]?.trim() ?? ''
    const numeric = draft === '' ? null : Number(draft)

    if (numeric === null || Number.isNaN(numeric)) {
      toast.error('กรุณากำหนดราคาให้ถูกต้อง')
      return
    }

    setSavingPriceId(product.id)
    startSavingTransition(async () => {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ typeId: product.typeId, price: numeric, isLocal: true }),
      })

      setSavingPriceId(null)

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.message ?? 'บันทึกราคาไม่สำเร็จ')
        return
      }

      toast.success('บันทึกราคาใหม่เรียบร้อย')
      setProducts((prev) =>
        prev.map((item) =>
          item.id === product.id ? { ...item, price: numeric } : item
        )
      )
      setPriceDrafts((prev) => ({ ...prev, [product.id]: numeric.toString() }))
    })
  }

  const handleSavePriceVip = (product: ProductRow) => {
    const draft = priceVipDrafts[product.id]?.trim() ?? ''
    const numeric = draft === '' ? null : Number(draft)

    if (draft !== '' && (numeric === null || Number.isNaN(numeric))) {
      toast.error('กรุณากำหนดราคา VIP ให้ถูกต้อง')
      return
    }

    setSavingPriceVipId(product.id)
    startSavingTransition(async () => {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ typeId: product.typeId, priceVip: numeric, isLocal: true }),
      })

      setSavingPriceVipId(null)

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.message ?? 'บันทึกราคา VIP ไม่สำเร็จ')
        return
      }

      toast.success('บันทึกราคา VIP เรียบร้อย')
      setProducts((prev) =>
        prev.map((item) =>
          item.id === product.id ? { ...item, priceVip: numeric } : item
        )
      )
      setPriceVipDrafts((prev) => ({ ...prev, [product.id]: numeric !== null ? numeric.toString() : '' }))
    })
  }

  const handleSaveCostPrice = (product: ProductRow) => {
    const draft = costPriceDrafts[product.id]?.trim() ?? ''
    const numeric = draft === '' ? null : Number(draft)

    if (draft !== '' && (numeric === null || Number.isNaN(numeric))) {
      toast.error('กรุณากำหนดต้นทุนจริงให้ถูกต้อง')
      return
    }

    setSavingCostPriceId(product.id)
    startSavingTransition(async () => {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ typeId: product.typeId, costPrice: numeric, isLocal: true }),
      })

      setSavingCostPriceId(null)

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.message ?? 'บันทึกต้นทุนจริงไม่สำเร็จ')
        return
      }

      toast.success('บันทึกต้นทุนจริงเรียบร้อย')
      setProducts((prev) =>
        prev.map((item) =>
          item.id === product.id ? { ...item, costPrice: numeric } : item
        )
      )
      setCostPriceDrafts((prev) => ({ ...prev, [product.id]: numeric !== null ? numeric.toString() : '' }))
    })
  }

  const handleSavePriceWalkin = (product: ProductRow) => {
    const draft = priceWalkinDrafts[product.id]?.trim() ?? ''
    const numeric = draft === '' ? null : Number(draft)

    if (draft !== '' && (numeric === null || Number.isNaN(numeric))) {
      toast.error('กรุณากำหนดราคาขาจรให้ถูกต้อง')
      return
    }

    setSavingPriceWalkinId(product.id)
    startSavingTransition(async () => {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ typeId: product.typeId, priceWalkin: numeric, isLocal: true }),
      })

      setSavingPriceWalkinId(null)

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.message ?? 'บันทึกราคาขาจรไม่สำเร็จ')
        return
      }

      toast.success('บันทึกราคาขาจรเรียบร้อย')
      setProducts((prev) =>
        prev.map((item) =>
          item.id === product.id ? { ...item, priceWalkin: numeric } : item
        )
      )
      setPriceWalkinDrafts((prev) => ({ ...prev, [product.id]: numeric !== null ? numeric.toString() : '' }))
    })
  }

  const handleApplyProfit = async (mode: 'amount' | 'percent', value: number) => {
    if (value < 0) {
      toast.error('กำไรต้องไม่ติดลบ')
      return false
    }

    setIsApplyingProfit(true)
    try {
      const res = await fetch('/api/admin/products/profit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mode, value, isLocal: true }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.message ?? 'ตั้งกำไรไม่สำเร็จ')
        return false
      }

      toast.success(
        mode === 'amount'
          ? `บวกกำไร ${value.toLocaleString()} บาท ให้ครบทุกสินค้าแล้ว`
          : `กำไร ${value}% ถูกนำไปบวกกับต้นทุนทุกสินค้าแล้ว`
      )
      
      // Refresh current page to show updated prices
      fetchProducts(currentPage)
      
      return true
    } catch (error) {
      console.error('apply profit error', error)
      toast.error('ตั้งกำไรไม่สำเร็จ')
      return false
    } finally {
      setIsApplyingProfit(false)
    }
  }

  // Use all categories from API (not just current page)
  const categoryImageMap = useMemo(() => {
    const map = new Map<string, string | null>()
    allCategories.forEach((item) => {
      map.set(item.category, item.imageUrl)
    })
    return map
  }, [allCategories])

  const categoryOptions = useMemo(
    () => ['ทั้งหมด', ...allCategories.map(c => c.category).sort((a, b) => a.localeCompare(b, 'th'))],
    [allCategories]
  )

  // Filtering is now done server-side, so we just use products directly
  // Client-side filtering is no longer needed
  const filteredProducts = products

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxPages = 7 // Show max 7 page buttons
    
    if (totalPages <= maxPages) {
      // Show all pages if total pages is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Show first page
      pages.push(1)
      
      if (currentPage > 3) {
        pages.push('...')
      }
      
      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...')
      }
      
      // Show last page
      pages.push(totalPages)
    }
    
    return pages
  }

  return (
    <>
      <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--theme-color)]/20 bg-white p-4 shadow-sm shadow-[var(--theme-color)40] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-[#6B7280]">
              ทั้งหมด {total.toLocaleString()} รายการ (แสดง {products.length} รายการ)
            </span>
            <span className="text-sm font-semibold text-[#0B0B0B]">ค้นหาสินค้าเพื่อจัดการ</span>
          </div>
          <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  setProductFormData({
                    typeId: '',
                    name: '',
                  imageUrl: '',
                  details: '',
                  price: '',
                  priceVip: '',
                  costPrice: '',
                  priceWalkin: '',
                  stock: '',
                  categoryId: '',
                  accountEmail: '',
                  accountPassword: '',
                  isPublished: false,
                  badge: null,
                  newCategoryName: '',
                })
                setIsCreateDialogOpen(true)
              }}
              className="bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)]"
            >
              <Plus className="mr-2 size-4" />
              เพิ่มสินค้า
            </Button>
            <>
              <Button
                id="product-profit-amount-btn"
                type="button"
                variant="outline"
                className="border-[var(--theme-color)]/40 text-[var(--theme-color)] hover:border-[var(--theme-color)] hover:bg-[var(--theme-color)]/10 hover:text-[var(--theme-color)]"
                disabled={isApplyingProfit || isPending}
              >
                ตั้งกำไร (บาท)
              </Button>
              <Button
                id="product-profit-percent-btn"
                type="button"
                variant="outline"
                className="border-[var(--theme-color)]/40 text-[var(--theme-color)] hover:border-[var(--theme-color)] hover:bg-[var(--theme-color)]/10 hover:text-[var(--theme-color)]"
                disabled={isApplyingProfit || isPending}
              >
                ตั้งกำไร (%)
              </Button>
            </>
            <>
              <Button
                type="button"
                variant="outline"
                className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
                onClick={() => handleBulkPublishClick(true)}
                disabled={isBulkUpdating || isPending}
              >
                {isBulkUpdating ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                เผยแพร่ทั้งหมด
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => handleBulkPublishClick(false)}
                disabled={isBulkUpdating || isPending}
              >
                {isBulkUpdating ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                ไม่เผยแพร่ทั้งหมด
              </Button>
            </>
          </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="พิมพ์ชื่อสินค้า" 
            className="w-full border-none bg-[#F9FAFB] text-sm focus-visible:ring-[var(--theme-color)] sm:flex-1"
            />
            <Button
              type="button"
              className="bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)] hover:text-white"
              onClick={() => setSearchTerm('')}
            >
              ล้างคำค้น
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {categoryOptions.map((category) => {
            const imageSrc = categoryImageMap.get(category ?? '') ?? null
            return (
              <Button
                key={category}
                type="button"
                variant={category === selectedCategory ? 'default' : 'outline'}
                className={cn(
                  'h-9 rounded-full px-4 text-sm',
                  category === selectedCategory
                    ? 'bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)] hover:text-white'
                    : 'border-[var(--theme-color)]/40 text-[var(--theme-color)] hover:border-[var(--theme-color)] hover:bg-[var(--theme-color)]/10 hover:text-[var(--theme-color)]'
                )}
                onClick={() => setSelectedCategory(category)}
              >
                <span className="flex items-center gap-2">
                  {category !== 'ทั้งหมด' ? (
                    <span className="relative flex size-6 items-center justify-center overflow-hidden rounded-full bg-white/60">
                      {imageSrc ? (
                        <Image
                          src={imageSrc}
                          alt={category}
                          fill
                          className="object-contain"
                          sizes="24px"
                          unoptimized
                        />
                      ) : (
                        <span className="text-[10px] font-semibold text-[#6B7280]">
                          {category.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </span>
                  ) : null}
                  <span>{category}</span>
                </span>
              </Button>
            )
          })}
        </div>
      </div>
      <div className="text-xs text-[#6B7280]">
        {isPending ? <span>กำลังประมวลผล...</span> : null}
      </div>
      <Separator className="bg-[#E5E7EB]" />
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="text-[#6B7280]">
              <th className="w-[20%] py-2 pr-2">สินค้า</th>
              <th className="w-[12%] py-2 pr-2">หมวด</th>
              <th className="w-[10%] py-2 pr-2">ต้นทุนจริง</th>
              <th className="w-[10%] py-2 pr-2">ราคา</th>
              <th className="w-[10%] py-2 pr-2">สต๊อก</th>
                <>
                  <th className="w-[10%] py-2 pr-2">ราคา VIP</th>
                  <th className="w-[10%] py-2 pr-2">ราคาขาจร</th>
                </>
              <th className="w-[10%] py-2 pr-2">เผยแพร่</th>
              <th className="w-[18%] py-2 pr-0 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {isPending && products.length === 0 ? (
              // Skeleton loading rows
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-t border-[#E5E7EB]">
                  <td className="py-2 pr-2">
                    <div className="flex gap-3">
                      <div className="h-14 w-14 shrink-0 rounded-xl bg-[#F4F4F5] animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 rounded bg-[#F4F4F5] animate-pulse" />
                        <div className="h-3 w-1/2 rounded bg-[#F4F4F5] animate-pulse" />
                      </div>
                    </div>
                  </td>
                  <td className="py-2 pr-2">
                    <div className="h-6 w-16 rounded bg-[#F4F4F5] animate-pulse" />
                  </td>
                  <td className="py-2 pr-2">
                    <div className="h-8 w-20 rounded bg-[#F4F4F5] animate-pulse" />
                  </td>
                  <td className="py-2 pr-2">
                    <div className="h-8 w-20 rounded bg-[#F4F4F5] animate-pulse" />
                  </td>
                  <td className="py-2 pr-2">
                    <div className="h-8 w-20 rounded bg-[#F4F4F5] animate-pulse" />
                  </td>
                  <td className="py-2 pr-2">
                    <div className="h-8 w-20 rounded bg-[#F4F4F5] animate-pulse" />
                  </td>
                  <td className="py-2 pr-2">
                    <div className="h-6 w-12 rounded bg-[#F4F4F5] animate-pulse" />
                  </td>
                  <td className="py-2 pr-2">
                    <div className="flex justify-end gap-2">
                      <div className="h-8 w-16 rounded bg-[#F4F4F5] animate-pulse" />
                      <div className="h-8 w-16 rounded bg-[#F4F4F5] animate-pulse" />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              filteredProducts.map((product) => (
              <tr key={product.id} className="border-t border-[#E5E7EB] align-top">
                <td className="align-top py-2 pr-2">
                  <div className="flex gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#F4F4F5]">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          sizes="56px"
                          className="object-contain"
                          unoptimized
                        />
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-[#0B0B0B] whitespace-pre-line line-clamp-2">{normalizeNewlines(product.name)}</p>
                      {product.details ? (
                        <p className="line-clamp-2 text-xs text-[#6B7280] whitespace-pre-line">
                          {normalizeNewlines(product.details.replace(/<[^>]+>/g, ''))}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="align-top py-2 pr-2 text-[#111827]">
                  {product.typeMenu ? (
                    <Badge className="bg-[var(--theme-color)]/10 text-[var(--theme-color)]">{product.typeMenu}</Badge>
                  ) : (
                    <span>-</span>
                  )}
                </td>
                <td className="align-top py-2 pr-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={costPriceDrafts[product.id] ?? ''}
                      onChange={(e) => handleCostPriceDraftChange(product.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          e.currentTarget.blur()
                          const draft = costPriceDrafts[product.id]?.trim() ?? ''
                          const current = product.costPrice != null ? String(product.costPrice) : ''
                          if (draft !== current) handleSaveCostPrice(product)
                        }
                      }}
                      disabled={savingCostPriceId === product.id}
                      className="h-8 w-20 text-xs text-red-600 font-medium bg-red-50 border-red-200 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus-visible:ring-red-300"
                      placeholder="0"
                    />
                    {savingCostPriceId === product.id ? (
                      <Loader2 className="size-3 animate-spin text-red-500" />
                    ) : (costPriceDrafts[product.id]?.trim() ?? '') !== (product.costPrice != null ? String(product.costPrice) : '') ? (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 shrink-0" onClick={() => handleSaveCostPrice(product)}>
                        <Check className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </td>
                <td className="align-top py-2 pr-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={priceDrafts[product.id] ?? ''}
                      onChange={(e) => handlePriceDraftChange(product.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          e.currentTarget.blur()
                          const draft = priceDrafts[product.id]?.trim() ?? ''
                          const current = product.price != null ? String(product.price) : ''
                          if (draft !== current) handleSavePrice(product)
                        }
                      }}
                      disabled={savingPriceId === product.id}
                      className="h-8 w-20 text-xs [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      placeholder="0"
                    />
                    {savingPriceId === product.id ? (
                      <Loader2 className="size-3 animate-spin text-[var(--theme-color)]" />
                    ) : (priceDrafts[product.id]?.trim() ?? '') !== (product.price != null ? String(product.price) : '') ? (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 shrink-0" onClick={() => handleSavePrice(product)}>
                        <Check className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </td>
                <td className="align-top py-2 pr-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={stockDrafts[product.id] ?? ''}
                      onChange={(e) => handleStockDraftChange(product.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          e.currentTarget.blur()
                          const draft = stockDrafts[product.id]?.trim() ?? ''
                          const current = product.stock != null ? String(product.stock) : ''
                          if (draft !== current) handleSaveStock(product)
                        }
                      }}
                      disabled={savingStockId === product.id}
                      className="h-8 w-20 text-xs text-blue-600 font-medium bg-blue-50 border-blue-200 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus-visible:ring-blue-300"
                      placeholder="0"
                    />
                    {savingStockId === product.id ? (
                      <Loader2 className="size-3 animate-spin text-blue-500" />
                    ) : (stockDrafts[product.id]?.trim() ?? '') !== (product.stock != null ? String(product.stock) : '') ? (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 shrink-0" onClick={() => handleSaveStock(product)}>
                        <Check className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </td>
                  <>
                <td className="align-top py-2 pr-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={priceVipDrafts[product.id] ?? ''}
                      onChange={(e) => handlePriceVipDraftChange(product.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          e.currentTarget.blur()
                          const draft = priceVipDrafts[product.id]?.trim() ?? ''
                          const current = product.priceVip != null ? String(product.priceVip) : ''
                          if (draft !== current) handleSavePriceVip(product)
                        }
                      }}
                      disabled={savingPriceVipId === product.id}
                      className="h-8 w-20 text-xs text-amber-600 font-medium bg-amber-50 border-amber-200 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus-visible:ring-amber-300"
                      placeholder="0"
                    />
                    {savingPriceVipId === product.id ? (
                      <Loader2 className="size-3 animate-spin text-amber-500" />
                    ) : (priceVipDrafts[product.id]?.trim() ?? '') !== (product.priceVip != null ? String(product.priceVip) : '') ? (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 shrink-0" onClick={() => handleSavePriceVip(product)}>
                        <Check className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </td>
                <td className="align-top py-2 pr-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={priceWalkinDrafts[product.id] ?? ''}
                      onChange={(e) => handlePriceWalkinDraftChange(product.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          e.currentTarget.blur()
                          const draft = priceWalkinDrafts[product.id]?.trim() ?? ''
                          const current = product.priceWalkin != null ? String(product.priceWalkin) : ''
                          if (draft !== current) handleSavePriceWalkin(product)
                        }
                      }}
                      disabled={savingPriceWalkinId === product.id}
                      className="h-8 w-20 text-xs [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      placeholder="0"
                    />
                    {savingPriceWalkinId === product.id ? (
                      <Loader2 className="size-3 animate-spin text-[var(--theme-color)]" />
                    ) : (priceWalkinDrafts[product.id]?.trim() ?? '') !== (product.priceWalkin != null ? String(product.priceWalkin) : '') ? (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 shrink-0" onClick={() => handleSavePriceWalkin(product)}>
                        <Check className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </td>
                </>
                <td className="align-top py-2 pr-2">
                  <div className="flex items-center gap-3">
                    <Switch
                      id={`publish-${product.id}`}
                      checked={product.isPublished}
                      onCheckedChange={(value) =>
                        handleTogglePublish(product, Boolean(value))
                      }
                      className="data-[state=checked]:bg-[var(--theme-color)] data-[state=checked]:hover:bg-[var(--theme-color)]"
                    />
                    <Label
                      htmlFor={`publish-${product.id}`}
                      className="text-xs text-[#6B7280]"
                    >
                      {product.isPublished ? 'แสดง' : 'ซ่อน'}
                    </Label>
                  </div>
                </td>
                <td className="align-top py-2 pr-2">
                  <div className="flex items-center justify-end gap-2">
                    <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedProduct(product)
                        setProductFormData({
                          typeId: product.typeId,
                          name: product.name,
                          imageUrl: product.imageUrl || '',
                          details: product.details || '',
                          price: product.price?.toString() || '',
                          priceVip: product.priceVip?.toString() || '',
                          costPrice: product.costPrice?.toString() || '',
                          priceWalkin: product.priceWalkin?.toString() || '',
                          stock: '',
                          categoryId: product.categoryId || '',
                          accountEmail: '',
                          accountPassword: '',
                          isPublished: product.isPublished,
                          badge: product.badge,
                          newCategoryName: '',
                        })
                        setIsEditDialogOpen(true)
                      }}
                      className="h-8 text-xs border-[var(--theme-color)]/40 text-[var(--theme-color)] hover:bg-[var(--theme-color)] hover:text-white hover:border-[var(--theme-color)]"
                    >
                      <Edit className="mr-1 size-3" />
                      แก้ไข
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        window.location.href = `/admin?menu=local-stock&search=${encodeURIComponent(product.typeId)}`
                      }}
                      className="h-8 text-xs border-[var(--theme-color)]/40 text-[var(--theme-color)] hover:bg-[var(--theme-color)] hover:text-white hover:border-[var(--theme-color)]"
                    >
                      <Package className="mr-1 size-3" />
                      จัดการสต๊อก
                    </Button>
                    </>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedProduct(product)
                        setIsDeleteDialogOpen(true)
                      }}
                      className="h-8 text-xs border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="mr-1 size-3" />
                      ลบ
                    </Button>
                  </div>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
        {filteredProducts.length === 0 ? (
          <div className="py-8 text-center text-sm text-[#6B7280]">
            ไม่พบสินค้าที่สอดคล้องกับการค้นหา
          </div>
        ) : null}
      </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[#E5E7EB] px-4 py-4 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (currentPage > 1) {
                  setCurrentPage(currentPage - 1)
                }
              }}
              disabled={currentPage === 1 || isPending}
              className="border-[#E5E7EB]"
            >
              ก่อนหน้า
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (currentPage < totalPages) {
                  setCurrentPage(currentPage + 1)
                }
              }}
              disabled={currentPage === totalPages || isPending}
              className="border-[#E5E7EB]"
            >
              ถัดไป
            </Button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-[#6B7280]">
                แสดง <span className="font-medium text-[#0B0B0B]">{((currentPage - 1) * itemsPerPage) + 1}</span> ถึง{' '}
                <span className="font-medium text-[#0B0B0B]">
                  {Math.min(currentPage * itemsPerPage, total)}
                </span>{' '}
                จาก <span className="font-medium text-[#0B0B0B]">{total.toLocaleString()}</span> รายการ
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (currentPage > 1) {
                    setCurrentPage(currentPage - 1)
                  }
                }}
                disabled={currentPage === 1 || isPending}
                className="border-[#E5E7EB]"
              >
                <ChevronLeft className="size-4" />
                ก่อนหน้า
              </Button>
              
              <div className="flex items-center gap-1">
                {getPageNumbers().map((page, index) => {
                  if (page === '...') {
                    return (
                      <span key={`ellipsis-${index}`} className="px-2 text-sm text-[#6B7280]">
                        ...
                      </span>
                    )
                  }
                  
                  const pageNum = page as number
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      disabled={isPending}
                      className={
                        currentPage === pageNum
                          ? 'bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)]'
                          : 'border-[#E5E7EB]'
                      }
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (currentPage < totalPages) {
                    setCurrentPage(currentPage + 1)
                  }
                }}
                disabled={currentPage === totalPages || isPending}
                className="border-[#E5E7EB]"
              >
                ถัดไป
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Create Product Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>เพิ่มสินค้าใหม่</DialogTitle>
            <DialogDescription>กรอกข้อมูลสินค้า</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-typeId">Type ID *</Label>
              <Input
                id="create-typeId"
                value={productFormData.typeId}
                onChange={(e) => setProductFormData({ ...productFormData, typeId: e.target.value })}
                placeholder="เช่น netflix-premium-30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-name">ชื่อสินค้า *</Label>
              <Input
                id="create-name"
                value={productFormData.name}
                onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                placeholder="เช่น Netflix Premium 30 วัน"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-categoryId">หมวดหมู่</Label>
              <Select
                value={productFormData.categoryId || "none"}
                onValueChange={(value) => setProductFormData({ ...productFormData, categoryId: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกหมวดหมู่" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ไม่มีหมวดหมู่</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="new">+ สร้างหมวดหมู่ใหม่</SelectItem>
                </SelectContent>
              </Select>
              {productFormData.categoryId === 'new' && (
                <div className="mt-2 space-y-2">
                  <Label htmlFor="create-newCategoryName">ชื่อหมวดหมู่ใหม่</Label>
                  <Input
                    id="create-newCategoryName"
                    value={productFormData.newCategoryName || ''}
                    onChange={(e) => setProductFormData({ ...productFormData, newCategoryName: e.target.value })}
                    placeholder="ระบุชื่อหมวดหมู่ใหม่"
                    className="h-9"
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-imageUrl">รูปภาพสินค้า</Label>
              <div className="flex flex-col gap-2">
                {productFormData.imageUrl && (
                  <div className="relative size-20 overflow-hidden rounded-lg border border-[var(--theme-color)]/20 bg-zinc-50">
                    <img
                      src={productFormData.imageUrl}
                      alt="Product Preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Label
                    htmlFor="create-product-file-upload"
                    className="flex h-9 cursor-pointer items-center justify-center rounded-lg bg-[var(--theme-color)]/10 px-3 text-center text-xs font-semibold text-[var(--theme-color)] transition hover:bg-[var(--theme-color)]/20 shrink-0"
                  >
                    อัปโหลดรูปภาพ
                  </Label>
                  <input
                    id="create-product-file-upload"
                    type="file"
                    accept={ADMIN_IMAGE_ACCEPT}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileChange(file)
                    }}
                    className="hidden"
                    disabled={isPending}
                  />
                  {productFormData.imageUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setProductFormData({ ...productFormData, imageUrl: '' })}
                      className="h-9 px-3 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs rounded-lg"
                      disabled={isPending}
                    >
                      ลบรูปภาพ
                    </Button>
                  )}
                </div>
                <Input
                  id="create-imageUrl"
                  value={productFormData.imageUrl}
                  onChange={(e) => setProductFormData({ ...productFormData, imageUrl: e.target.value })}
                  placeholder="หรือใส่ URL รูปภาพ (เช่น https://example.com/image.png)"
                  className="text-xs"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-details">รายละเอียด</Label>
              <textarea
                id="create-details"
                value={productFormData.details}
                onChange={(e) => setProductFormData({ ...productFormData, details: e.target.value })}
                placeholder="รายละเอียดสินค้า"
                className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="create-price">ราคา (พ้อยท์) *</Label>
              <Input
                id="create-price"
                type="number"
                value={productFormData.price}
                onChange={(e) => setProductFormData({ ...productFormData, price: e.target.value })}
                placeholder="0"
              />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-priceVip">ราคา VIP</Label>
                <Input
                  id="create-priceVip"
                  type="number"
                  value={productFormData.priceVip}
                  onChange={(e) => setProductFormData({ ...productFormData, priceVip: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-costPrice">ต้นทุนจริง</Label>
                <Input
                  id="create-costPrice"
                  type="number"
                  value={productFormData.costPrice}
                  onChange={(e) => setProductFormData({ ...productFormData, costPrice: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-priceWalkin">ราคาขาจร</Label>
                <Input
                  id="create-priceWalkin"
                  type="number"
                  value={productFormData.priceWalkin}
                  onChange={(e) => setProductFormData({ ...productFormData, priceWalkin: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-stock">จำนวนสต๊อก</Label>
                <Input
                  id="create-stock"
                  type="number"
                  value={productFormData.stock}
                  onChange={(e) => setProductFormData({ ...productFormData, stock: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-badge">Badge</Label>
              <Select
                value={productFormData.badge || "none"}
                onValueChange={(value) => setProductFormData({ ...productFormData, badge: value === "none" ? null : (value as 'hot_sale' | 'recommended') })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="ไม่มี badge" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ไม่มี badge</SelectItem>
                  <SelectItem value="hot_sale">Hot Sale</SelectItem>
                  <SelectItem value="recommended">แนะนำ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="create-isPublished"
                checked={productFormData.isPublished}
                onCheckedChange={(checked) => setProductFormData({ ...productFormData, isPublished: checked })}
              />
              <Label htmlFor="create-isPublished">เผยแพร่</Label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isPending}>
                ยกเลิก
              </Button>
            </DialogClose>
            <Button
              onClick={async () => {
                if (!productFormData.typeId.trim() || !productFormData.name.trim()) {
                  toast.error('กรุณากรอก Type ID และชื่อสินค้า')
                  return
                }
                startTransition(async () => {
                  try {
                    const res = await fetch('/api/admin/products', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        typeId: productFormData.typeId.trim(),
                        name: productFormData.name.trim(),
                        imageUrl: productFormData.imageUrl.trim() || null,
                        details: productFormData.details.trim() || null,
                        price: productFormData.price ? parseFloat(productFormData.price) : null,
                        priceVip: productFormData.priceVip ? parseFloat(productFormData.priceVip) : null,
                        costPrice: productFormData.costPrice ? parseFloat(productFormData.costPrice) : null,
                        priceWalkin: productFormData.priceWalkin ? parseFloat(productFormData.priceWalkin) : null,
                        stock: productFormData.stock ? parseInt(productFormData.stock, 10) : null,
                        categoryId: productFormData.categoryId && productFormData.categoryId !== "none" && productFormData.categoryId !== "new" ? productFormData.categoryId : null,
                        newCategoryName: productFormData.categoryId === "new" ? productFormData.newCategoryName : null,
                        accountEmail: productFormData.accountEmail.trim() || null,
                        accountPassword: productFormData.accountPassword.trim() || null,
                        isPublished: productFormData.isPublished,
                        badge: productFormData.badge || null,
                        isLocal: true,
                      }),
                    })
                    if (!res.ok) {
                      const data = (await res.json()) as { message: string }
                      toast.error(data.message || 'สร้างสินค้าไม่สำเร็จ')
                      return
                    }
                    toast.success('สร้างสินค้าเรียบร้อย')
                    setIsCreateDialogOpen(false)
                    fetchProducts(currentPage)
                  } catch (error) {
                    toast.error('เกิดข้อผิดพลาดในการสร้างสินค้า')
                  }
                })
              }}
              disabled={isPending}
              className="bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)]"
            >
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              สร้าง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>แก้ไขสินค้า</DialogTitle>
            <DialogDescription>แก้ไขข้อมูลสินค้า</DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-typeId">Type ID *</Label>
                  <Input
                    id="edit-typeId"
                    value={productFormData.typeId}
                    onChange={(e) => setProductFormData({ ...productFormData, typeId: e.target.value })}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-name">ชื่อสินค้า *</Label>
                  <Input
                    id="edit-name"
                    value={productFormData.name}
                    onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-categoryId">หมวดหมู่</Label>
                  <Select
                    value={productFormData.categoryId || "none"}
                    onValueChange={(value) => setProductFormData({ ...productFormData, categoryId: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกหมวดหมู่" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">ไม่มีหมวดหมู่</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="new">+ สร้างหมวดหมู่ใหม่</SelectItem>
                    </SelectContent>
                  </Select>
                  {productFormData.categoryId === 'new' && (
                    <div className="mt-2 space-y-2">
                      <Label htmlFor="edit-newCategoryName">ชื่อหมวดหมู่ใหม่</Label>
                      <Input
                        id="edit-newCategoryName"
                        value={productFormData.newCategoryName || ''}
                        onChange={(e) => setProductFormData({ ...productFormData, newCategoryName: e.target.value })}
                        placeholder="ระบุชื่อหมวดหมู่ใหม่"
                        className="h-9"
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-imageUrl">รูปภาพสินค้า</Label>
                  <div className="flex flex-col gap-2">
                    {productFormData.imageUrl && (
                      <div className="relative size-20 overflow-hidden rounded-lg border border-[var(--theme-color)]/20 bg-zinc-50">
                        <img
                          src={productFormData.imageUrl}
                          alt="Product Preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Label
                        htmlFor="edit-product-file-upload"
                        className="flex h-9 cursor-pointer items-center justify-center rounded-lg bg-[var(--theme-color)]/10 px-3 text-center text-xs font-semibold text-[var(--theme-color)] transition hover:bg-[var(--theme-color)]/20 shrink-0"
                      >
                        อัปโหลดรูปภาพ
                      </Label>
                      <input
                        id="edit-product-file-upload"
                        type="file"
                        accept={ADMIN_IMAGE_ACCEPT}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileChange(file)
                        }}
                        className="hidden"
                        disabled={isPending}
                      />
                      {productFormData.imageUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setProductFormData({ ...productFormData, imageUrl: '' })}
                          className="h-9 px-3 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs rounded-lg"
                          disabled={isPending}
                        >
                          ลบรูปภาพ
                        </Button>
                      )}
                    </div>
                    <Input
                      id="edit-imageUrl"
                      value={productFormData.imageUrl}
                      onChange={(e) => setProductFormData({ ...productFormData, imageUrl: e.target.value })}
                      placeholder="หรือใส่ URL รูปภาพ"
                      className="text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-details">รายละเอียด</Label>
                  <textarea
                    id="edit-details"
                    value={productFormData.details}
                    onChange={(e) => setProductFormData({ ...productFormData, details: e.target.value })}
                    className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-price">ราคา (พ้อยท์) *</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      value={productFormData.price}
                      onChange={(e) => setProductFormData({ ...productFormData, price: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-priceVip">ราคา VIP</Label>
                    <Input
                      id="edit-priceVip"
                      type="number"
                      value={productFormData.priceVip}
                      onChange={(e) => setProductFormData({ ...productFormData, priceVip: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-costPrice">ต้นทุนจริง</Label>
                    <Input
                      id="edit-costPrice"
                      type="number"
                      value={productFormData.costPrice}
                      onChange={(e) => setProductFormData({ ...productFormData, costPrice: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-priceWalkin">ราคาขาจร</Label>
                    <Input
                      id="edit-priceWalkin"
                      type="number"
                      value={productFormData.priceWalkin}
                      onChange={(e) => setProductFormData({ ...productFormData, priceWalkin: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-stock">จำนวนสต๊อก</Label>
                    <Input
                      id="edit-stock"
                      type="number"
                      value={productFormData.stock}
                      onChange={(e) => setProductFormData({ ...productFormData, stock: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-badge">Badge</Label>
                  <Select
                    value={productFormData.badge || "none"}
                    onValueChange={(value) => setProductFormData({ ...productFormData, badge: value === "none" ? null : (value as 'hot_sale' | 'recommended') })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="ไม่มี badge" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">ไม่มี badge</SelectItem>
                      <SelectItem value="hot_sale">Hot Sale</SelectItem>
                      <SelectItem value="recommended">แนะนำ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="edit-isPublished"
                    checked={productFormData.isPublished}
                    onCheckedChange={(checked) => setProductFormData({ ...productFormData, isPublished: checked })}
                    className="data-[state=checked]:bg-[var(--theme-color)] data-[state=checked]:hover:bg-[var(--theme-color)]"
                  />
                  <Label htmlFor="edit-isPublished" className="text-sm font-medium text-[#0B0B0B]">เผยแพร่บนหน้าเว็บ</Label>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={isPending}>
                    ยกเลิก
                  </Button>
                </DialogClose>
                <Button
                  onClick={async () => {
                    if (!productFormData.name.trim()) {
                      toast.error('กรุณากรอกชื่อสินค้า')
                      return
                    }
                    startTransition(async () => {
                      try {
                        const res = await fetch('/api/admin/products', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({
                            typeId: selectedProduct.typeId,
                            name: productFormData.name.trim(),
                            imageUrl: productFormData.imageUrl.trim() || null,
                            details: productFormData.details.trim() || null,
                            price: productFormData.price ? parseFloat(productFormData.price) : null,
                            priceVip: productFormData.priceVip ? parseFloat(productFormData.priceVip) : null,
                            costPrice: productFormData.costPrice ? parseFloat(productFormData.costPrice) : null,
                            priceWalkin: productFormData.priceWalkin ? parseFloat(productFormData.priceWalkin) : null,
                            stock: productFormData.stock ? parseInt(productFormData.stock, 10) : null,
                            categoryId: productFormData.categoryId && productFormData.categoryId !== "none" && productFormData.categoryId !== "new" ? productFormData.categoryId : null,
                            newCategoryName: productFormData.categoryId === "new" ? productFormData.newCategoryName : null,
                            isPublished: productFormData.isPublished,
                            badge: productFormData.badge || null,
                          }),
                        })
                        if (!res.ok) {
                          const data = (await res.json()) as { message: string }
                          toast.error(data.message || 'อัปเดตสินค้าไม่สำเร็จ')
                          return
                        }
                        toast.success('อัปเดตสินค้าเรียบร้อย')
                        setIsEditDialogOpen(false)
                        setSelectedProduct(null)
                        fetchProducts(currentPage)
                      } catch (error) {
                        toast.error('เกิดข้อผิดพลาดในการอัปเดตสินค้า')
                      }
                    })
                  }}
                  disabled={isPending}
                  className="bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)]"
                >
                  {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  บันทึก
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Product Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>ยืนยันการลบสินค้า</DialogTitle>
            <DialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบสินค้า "{selectedProduct?.name}"? 
              การกระทำนี้ไม่สามารถยกเลิกได้ และจะไม่สามารถลบได้หากมีคำสั่งซื้อที่เกี่ยวข้อง
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isPending}>
                ยกเลิก
              </Button>
            </DialogClose>
            <Button
              onClick={async () => {
                if (!selectedProduct) return
                startTransition(async () => {
                  try {
                    const res = await fetch(`/api/admin/products?typeId=${selectedProduct.typeId}`, {
                      method: 'DELETE',
                      credentials: 'include',
                    })
                    if (!res.ok) {
                      const data = (await res.json()) as { message: string }
                      toast.error(data.message || 'ลบสินค้าไม่สำเร็จ')
                      return
                    }
                    toast.success('ลบสินค้าเรียบร้อย')
                    setIsDeleteDialogOpen(false)
                    setSelectedProduct(null)
                    fetchProducts(currentPage)
                  } catch (error) {
                    toast.error('เกิดข้อผิดพลาดในการลบสินค้า')
                  }
                })
              }}
              disabled={isPending}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              ลบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ProfitDialog
        mode="amount"
        isProcessing={isApplyingProfit}
        onConfirm={(value) => handleApplyProfit('amount', value)}
        open={isAmountDialogOpen}
        onOpenChange={setIsAmountDialogOpen}
        trigger={null}
      />
      <ProfitDialog
        mode="percent"
        isProcessing={isApplyingProfit}
        onConfirm={(value) => handleApplyProfit('percent', value)}
        open={isPercentDialogOpen}
        onOpenChange={setIsPercentDialogOpen}
        trigger={null}
      />

      {/* Bulk Publish Dialog */}
      <Dialog open={bulkPublishDialogOpen} onOpenChange={setBulkPublishDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {bulkPublishAction ? 'เผยแพร่สินค้า' : 'ไม่เผยแพร่สินค้า'}
            </DialogTitle>
            <DialogDescription>
              เลือกขอบเขตการ{bulkPublishAction ? 'เผยแพร่' : 'ไม่เผยแพร่'}สินค้า
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-[#0B0B0B]">เลือกขอบเขต</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] p-3 cursor-pointer hover:bg-[#F9FAFB]">
                  <input
                    type="radio"
                    name="bulkPublishScope"
                    checked={!bulkPublishOnlyWithStock}
                    onChange={() => setBulkPublishOnlyWithStock(false)}
                    className="size-4 text-[var(--theme-color)] focus:ring-[var(--theme-color)]"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#0B0B0B]">ทั้งหมด</p>
                    <p className="text-xs text-[#6B7280]">
                      {bulkPublishAction ? 'เผยแพร่' : 'ไม่เผยแพร่'}สินค้าทั้งหมดในระบบ
                    </p>
                  </div>
                </label>
                <label className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] p-3 cursor-pointer hover:bg-[#F9FAFB]">
                  <input
                    type="radio"
                    name="bulkPublishScope"
                    checked={bulkPublishOnlyWithStock}
                    onChange={() => setBulkPublishOnlyWithStock(true)}
                    className="size-4 text-[var(--theme-color)] focus:ring-[var(--theme-color)]"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#0B0B0B]">เฉพาะที่มีสต็อก</p>
                    <p className="text-xs text-[#6B7280]">
                      {bulkPublishAction ? 'เผยแพร่' : 'ไม่เผยแพร่'}เฉพาะสินค้าที่มีสต็อกมากกว่า 0
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between gap-3 sm:justify-end">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="rounded-xl">
                ยกเลิก
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleBulkPublishConfirm}
              className="rounded-xl bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)]"
              disabled={isBulkUpdating}
            >
              {isBulkUpdating ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  กำลังดำเนินการ...
                </>
              ) : (
                'ยืนยัน'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

type ProfitDialogProps = {
  mode: 'amount' | 'percent'
  isProcessing: boolean
  onConfirm: (value: number) => Promise<boolean>
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: ReactNode | null
}

function ProfitDialog({ mode, isProcessing, onConfirm, open, onOpenChange, trigger }: ProfitDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [value, setValue] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const isControlled = open !== undefined
  const dialogOpen = isControlled ? open : internalOpen

  const title = mode === 'amount' ? 'ตั้งกำไรรวม (บาท)' : 'ตั้งกำไรรวม (%)'
  const description =
    mode === 'amount'
      ? 'ระบบจะนำจำนวนบาทที่ระบุไปบวกเพิ่มจากราคาต้นทุน (VIP) ของทุกสินค้า'
      : 'ระบบจะบวกราคาจากต้นทุน (VIP) ของทุกสินค้า ตามเปอร์เซ็นต์ที่ระบุ'
  const unit = mode === 'amount' ? 'บาท' : '%'

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value
    if (/^\d*(\.\d{0,2})?$/.test(next) || next === '') {
      setValue(next)
      setLocalError(null)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const numeric = value.trim() === '' ? NaN : Number(value)

    if (!Number.isFinite(numeric)) {
      setLocalError('กรุณากรอกตัวเลขที่ถูกต้อง')
      return
    }

    const success = await onConfirm(numeric)
    if (success) {
      if (!isControlled) {
        setInternalOpen(false)
      }
      onOpenChange?.(false)
      setValue('')
      setLocalError(null)
    }
  }

  const handleOpenChange = (next: boolean) => {
    if (isProcessing) return
    if (!isControlled) {
      setInternalOpen(next)
    }
    onOpenChange?.(next)
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {trigger !== undefined ? (
        trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null
      ) : (
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-[var(--theme-color)]/40 text-sm font-semibold text-[var(--theme-color)] hover:border-[var(--theme-color)] hover:bg-[var(--theme-color)]/10 hover:text-[var(--theme-color)]"
          >
            {mode === 'amount' ? 'ตั้งกำไร (บาท)' : 'ตั้งกำไร (%)'}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[400px]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <DialogHeader className="space-y-2">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Label htmlFor={`profit-${mode}`}>มูลค่ากำไร ({unit})</Label>
            <div className="flex items-center gap-2">
              <Input
                id={`profit-${mode}`}
                value={value}
                onChange={handleChange}
                placeholder={mode === 'amount' ? 'เช่น 30' : 'เช่น 25'}
                inputMode="decimal"
                className="h-11 rounded-xl border-[var(--theme-color)]/40 focus-visible:ring-[var(--theme-color)]"
              />
              <span className="text-sm text-[#6B7280]">{unit}</span>
            </div>
            {localError ? <p className="text-xs text-[var(--theme-color)]">{localError}</p> : null}
          </div>
          <DialogFooter className="flex items-center justify-between gap-3 sm:justify-end">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="rounded-xl">
                ยกเลิก
              </Button>
            </DialogClose>
            <Button
              type="submit"
              className="rounded-xl bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)]"
              disabled={isProcessing}
            >
              {isProcessing ? 'กำลังบันทึก...' : 'บวกกำไร'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

