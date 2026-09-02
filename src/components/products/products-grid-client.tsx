'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, normalizeNewlines } from '@/lib/utils'
import { PurchaseProductButton } from '@/components/orders/purchase-product-button'
import { ProductPriceDisplay } from '@/components/products/product-price-display'
import { VipBadge } from '@/components/products/vip-badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { subscribeProductStockRealtime } from '@/lib/products/realtime-hub'
import { useLiveProductStock } from '@/components/products/product-stock-realtime-provider'
import { FallbackImage } from '@/components/ui/fallback-image'

type ProductCard = {
  id: string
  typeId: string
  name: string
  imageUrl: string | null
  fallbackImageUrl?: string | null
  typeImageUrl: string | null
  details: string | null
  price: number | null
  priceVip: number | null
  priceWalkin: number | null
  stock: number | null
  typeMenu: string | null
  badge: 'hot_sale' | 'recommended' | null
}

type CategoryInfo = {
  category: string
  imageUrl: string | null
  fallbackImageUrl?: string | null
  count: number
}

type ProductsGridClientProps = {
  initialProducts?: ProductCard[]
  initialTotal?: number
  initialTotalPages?: number
  initialCategories?: CategoryInfo[]
}

export default function ProductsGridClient({
  initialProducts,
  initialTotal = 0,
  initialTotalPages = 1,
  initialCategories = [],
}: ProductsGridClientProps) {
  const hasInitialData = initialProducts != null
  const [products, setProducts] = useState<ProductCard[]>(initialProducts ?? [])
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(
    hasInitialData ? initialTotalPages : 1
  )
  const [total, setTotal] = useState(hasInitialData ? initialTotal : 0)
  const [allCategories, setAllCategories] = useState<CategoryInfo[]>(initialCategories)
  const [isLoading, setIsLoading] = useState(!hasInitialData)
  const [realtimeRefreshVersion, setRealtimeRefreshVersion] = useState(0)
  const skipNextFetchRef = useRef(hasInitialData)
  const hasLoadedRef = useRef(hasInitialData)
  const refreshTimerRef = useRef<number | null>(null)
  const revisionControllerRef = useRef<AbortController | null>(null)
  const lastRevisionRef = useRef<string | null>(null)
  const lastFullRefreshRef = useRef(hasInitialData ? Date.now() : 0)
  const fullRefreshPendingRef = useRef(false)
  const forceFreshRef = useRef(false)
  const itemsPerPage = 12

  const requestFullRefresh = useCallback((forceFresh = true) => {
    forceFreshRef.current = forceFresh
    if (fullRefreshPendingRef.current) {
      return
    }
    fullRefreshPendingRef.current = true
    setRealtimeRefreshVersion((version) => version + 1)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim())
      setCurrentPage(1)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [searchTerm])

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    setCurrentPage(1)
  }

  useEffect(() => {
    return subscribeProductStockRealtime((patch) => {
      setProducts((prev) => {
        const index = prev.findIndex((item) => item.id === patch.id)
        if (index === -1) {
          return prev
        }
        if (!patch.isPublished) {
          return prev.filter((item) => item.id !== patch.id)
        }
        const next = [...prev]
        next[index] = {
          ...next[index],
          stock: patch.stock,
          badge: patch.badge,
          price: patch.price !== undefined ? patch.price : next[index].price,
          priceVip: patch.priceVip !== undefined ? patch.priceVip : next[index].priceVip,
          priceWalkin: patch.priceWalkin !== undefined ? patch.priceWalkin : next[index].priceWalkin,
        }
        return next
      })

      // Reconcile the full query so newly published products are inserted and
      // category/pagination counts update without a manual page refresh.
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current)
      }
      refreshTimerRef.current = window.setTimeout(() => {
        requestFullRefresh()
      }, 100)
    })
  }, [requestFullRefresh])

  useEffect(() => {
    let cancelled = false

    const checkRevision = async () => {
      if (cancelled || document.visibilityState !== 'visible') {
        return
      }

      revisionControllerRef.current?.abort()
      const controller = new AbortController()
      revisionControllerRef.current = controller

      try {
        const response = await fetch('/api/products/revision', {
          signal: controller.signal,
          cache: 'no-store',
        })
        if (!response.ok) {
          return
        }

        const data = (await response.json()) as { revision?: string }
        if (cancelled || !data.revision) {
          return
        }

        if (lastRevisionRef.current === null) {
          lastRevisionRef.current = data.revision
          return
        }

        if (lastRevisionRef.current !== data.revision) {
          lastRevisionRef.current = data.revision
          requestFullRefresh()
          return
        }

        // Master stock can change outside this database. Reconcile it at a
        // deliberately slow interval while the tab is visible.
        if (
          lastFullRefreshRef.current > 0 &&
          Date.now() - lastFullRefreshRef.current >= 5 * 60_000
        ) {
          requestFullRefresh()
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.warn('[products] revision check failed')
        }
      }
    }

    const interval = window.setInterval(() => {
      void checkRevision()
    }, 60_000)
    const handleActivity = () => {
      void checkRevision()
    }
    window.addEventListener('focus', handleActivity)
    document.addEventListener('visibilitychange', handleActivity)
    void checkRevision()

    return () => {
      cancelled = true
      window.clearInterval(interval)
      revisionControllerRef.current?.abort()
      revisionControllerRef.current = null
      window.removeEventListener('focus', handleActivity)
      document.removeEventListener('visibilitychange', handleActivity)
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current)
      }
    }
  }, [requestFullRefresh])

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    const isDefaultQuery =
      currentPage === 1 &&
      selectedCategory === 'ทั้งหมด' &&
      debouncedSearch.length === 0

    if (
      skipNextFetchRef.current &&
      isDefaultQuery &&
      realtimeRefreshVersion === 0
    ) {
      skipNextFetchRef.current = false
      return
    }

    const load = async () => {
      const showLoadingState = !hasLoadedRef.current
      if (showLoadingState) {
        setIsLoading(true)
      }

      const params = new URLSearchParams({
        pagination: 'true',
        page: String(currentPage),
        limit: String(itemsPerPage),
      })

      if (selectedCategory && selectedCategory !== 'ทั้งหมด') {
        params.append('category', selectedCategory)
      }

      if (debouncedSearch.length > 0) {
        params.append('search', debouncedSearch)
      }

      try {
        const res = await fetch(`/api/products?${params.toString()}`, {
          signal: controller.signal,
          cache: forceFreshRef.current ? 'no-store' : 'default',
        })
        forceFreshRef.current = false

        if (!res.ok) {
          throw new Error('failed')
        }

        const data = (await res.json()) as {
          products: ProductCard[]
          total: number
          page: number
          totalPages: number
          categories?: CategoryInfo[]
          revision?: string
        }

        if (cancelled) {
          return
        }

        setProducts(data.products)
        setTotal(data.total)
        setTotalPages(data.totalPages)
        hasLoadedRef.current = true
        fullRefreshPendingRef.current = false
        lastFullRefreshRef.current = Date.now()
        if (data.revision) {
          lastRevisionRef.current = data.revision
        }

        if (data.categories) {
          setAllCategories(data.categories)
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return
        }
        if (!cancelled && !hasLoadedRef.current) {
          toast.error('โหลดรายการสินค้าไม่สำเร็จ')
        }
      } finally {
        fullRefreshPendingRef.current = false
        if (!cancelled && showLoadingState) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [currentPage, selectedCategory, debouncedSearch, realtimeRefreshVersion])

  const sortedCategories = useMemo(
    () => [...allCategories].sort((a, b) => a.category.localeCompare(b.category, 'th')),
    [allCategories]
  )

  const categories = useMemo(
    () => ['ทั้งหมด', ...sortedCategories.map((c) => c.category)],
    [sortedCategories]
  )

  const categoryMetaMap = useMemo(() => {
    const map = new Map<string, { imageUrl: string | null; fallbackImageUrl: string | null; count: number }>()
    sortedCategories.forEach((item) => {
      map.set(item.category, {
        imageUrl: item.imageUrl,
        fallbackImageUrl: item.fallbackImageUrl ?? null,
        count: item.count,
      })
    })
    return map
  }, [sortedCategories])

  const totalCategoryCount = useMemo(
    () => sortedCategories.reduce((sum, item) => sum + item.count, 0),
    [sortedCategories]
  )

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxPages = 7
    
    if (totalPages <= maxPages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)
      
      if (currentPage > 3) {
        pages.push('...')
      }
      
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...')
      }
      
      pages.push(totalPages)
    }
    
    return pages
  }

  // Products ถูก sort แล้วใน repository (มีสต็อกมาก่อน, badge, name)
  const prioritizedProducts = products

  return (
    <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-6 xl:grid-cols-[280px_1fr]">
      <aside className="hidden lg:block">
        <Card className="sticky top-24 rounded-lg border border-[var(--theme-color)]/30 bg-white shadow-sm shadow-[var(--theme-color)]/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-[#0B0B0B]">หมวดหมู่สินค้า</CardTitle>
            <p className="text-xs text-[#6B7280]">เลือกดูสินค้าตามหมวดหมู่</p>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {[{ category: 'ทั้งหมด', imageUrl: null, count: totalCategoryCount }, ...sortedCategories].map((item) => {
              const isActive = selectedCategory === item.category
              const meta = categoryMetaMap.get(item.category)
              const imageUrl = item.category === 'ทั้งหมด' ? null : meta?.imageUrl ?? item.imageUrl ?? meta?.fallbackImageUrl ?? null
              const fallbackImageUrl = item.category === 'ทั้งหมด' ? null : meta?.fallbackImageUrl ?? null
              const count = item.category === 'ทั้งหมด' ? totalCategoryCount : meta?.count ?? item.count ?? 0

              return (
                <button
                  key={item.category}
                  type="button"
                  onClick={() => handleCategoryChange(item.category)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors',
                    isActive
                      ? 'border-[var(--theme-color)] bg-[var(--theme-color)]/10 text-[var(--theme-color)]'
                      : 'border-transparent text-[#0B0B0B] hover:bg-[#F9FAFB]'
                  )}
                >
                  <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#F4F4F5]">
                    {item.category === 'ทั้งหมด' ? (
                      <span className="text-xs font-semibold text-[var(--theme-color-text-accent)]">ALL</span>
                    ) : imageUrl ? (
                      <FallbackImage
                        src={imageUrl}
                        fallbackSrc={fallbackImageUrl}
                        alt={item.category}
                        fill
                        sizes="40px"
                        className="object-contain"
                        unoptimized
                      />
                    ) : (
                      <span className="text-sm font-semibold text-[var(--theme-color-text-accent)]">{(item.category || "").slice(0, 1)}</span>
                    )}
                  </span>
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm font-semibold leading-tight">{item.category}</span>
                    <span className="text-xs text-[#6B7280]">{count.toLocaleString()} สินค้า</span>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'rounded-full border border-transparent bg-[#FFE9ED] text-[11px] font-medium text-[var(--theme-color-text-accent)]',
                      isActive && 'border-[var(--theme-color-text-accent)] bg-[var(--theme-color-text-accent)] text-white'
                    )}
                  >
                    {count.toLocaleString()}
                  </Badge>
                  <ChevronRight className="size-4 text-[#D1D5DB]" />
                </button>
              )
            })}
          </CardContent>
        </Card>
      </aside>

      <div className="space-y-6 sm:space-y-8">
        <div className="space-y-3">
          <div className="flex w-full flex-col gap-3 rounded-lg border border-[#E5E7EB] bg-white p-3 shadow-sm shadow-[var(--theme-color)]/10 sm:p-4 sm:flex-row sm:items-center sm:gap-4">
            <div className="hidden items-center gap-3 sm:flex">
              <span className="flex size-10 items-center justify-center rounded-md bg-[var(--theme-color)]/10 text-[var(--theme-color)]">
                <Search className="size-5" />
              </span>
              <span className="text-sm font-semibold text-[#0B0B0B]">ค้นหา</span>
            </div>
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="พิมพ์ชื่อสินค้า เช่น Netflix"
              className="w-full border-none bg-[#F9FAFB] text-sm focus-visible:ring-[var(--theme-color)]"
              suppressHydrationWarning
            />
            <Button
              type="button"
              size="sm"
              className="bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)] hover:text-white sm:size-auto"
              onClick={() => setSearchTerm('')}
            >
              <span className="hidden sm:inline">ล้างคำค้น</span>
              <span className="sm:hidden">ล้าง</span>
            </Button>
          </div>

          <div className="w-full lg:hidden" suppressHydrationWarning>
            <div 
              className="flex w-full gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory [-webkit-overflow-scrolling:touch]"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              {/* Webkit scrollbar hiding style */}
              <style dangerouslySetInnerHTML={{__html: `
                .scrollbar-none::-webkit-scrollbar {
                  display: none !important;
                }
              `}} />

              {[{ category: 'ทั้งหมด', imageUrl: null, count: totalCategoryCount }, ...sortedCategories].map((item) => {
                const isActive = selectedCategory === item.category
                const meta = categoryMetaMap.get(item.category)
                const imageUrl = item.category === 'ทั้งหมด' ? null : meta?.imageUrl ?? item.imageUrl ?? meta?.fallbackImageUrl ?? null
                const fallbackImageUrl = item.category === 'ทั้งหมด' ? null : meta?.fallbackImageUrl ?? null
                const count = item.category === 'ทั้งหมด' ? totalCategoryCount : meta?.count ?? item.count ?? 0

                return (
                  <button
                    key={item.category}
                    type="button"
                    onClick={() => handleCategoryChange(item.category)}
                    className={cn(
                      'flex flex-shrink-0 items-center gap-2.5 rounded-xl border px-3 py-1.5 text-left transition-colors snap-start',
                      isActive
                        ? 'border-[var(--theme-color)] bg-[var(--theme-color)]/10 text-[var(--theme-color)]'
                        : 'border-[#E5E7EB] bg-white text-[#0B0B0B] hover:bg-[#F9FAFB]'
                    )}
                  >
                    <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#F4F4F5]">
                      {item.category === 'ทั้งหมด' ? (
                        <span className="text-[10px] font-bold text-[var(--theme-color)]">ALL</span>
                      ) : imageUrl ? (
                        <FallbackImage
                          src={imageUrl}
                          fallbackSrc={fallbackImageUrl}
                          alt={item.category}
                          fill
                          sizes="32px"
                          className="object-contain"
                          unoptimized
                        />
                      ) : (
                        <span className="text-xs font-semibold text-[var(--theme-color)]">{(item.category || "").slice(0, 1)}</span>
                      )}
                    </span>
                    <div className="flex flex-col min-w-[50px]">
                      <span className="text-xs font-bold leading-tight">{item.category}</span>
                      <span className="text-[10px] text-[#6B7280]">{count} สินค้า</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

      {isLoading ? (
        <>
          {/* Mobile skeleton: 2 columns */}
          <div className="grid grid-cols-2 gap-4 md:hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="border-transparent bg-white/95 shadow-sm">
                <CardContent className="flex flex-col items-center h-full p-5 text-center">
                  <div className="size-32 rounded-2xl bg-[var(--theme-color)]/10 animate-pulse mb-4" />
                  <div className="h-4 w-full rounded bg-[var(--theme-color)]/15 animate-pulse mb-auto min-h-[3rem]" />
                  <div className="flex flex-col items-center gap-2 mt-auto pt-4 w-full">
                    <div className="h-6 w-20 rounded bg-[var(--theme-color)]/20 animate-pulse" />
                    <div className="h-9 w-full rounded-lg bg-[var(--theme-color)]/20 animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Desktop skeleton: full details */}
          <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="border-transparent bg-white shadow-sm">
                <CardContent className="gap-6 py-6 flex h-full flex-col">
                  <div className="flex flex-row items-start gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-[var(--theme-color)]/10 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-full rounded bg-[var(--theme-color)]/15 animate-pulse" />
                      <div className="h-4 w-20 rounded bg-[var(--theme-color)]/10 animate-pulse" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-full rounded bg-[var(--theme-color)]/10 animate-pulse" />
                    <div className="h-3 w-full rounded bg-[var(--theme-color)]/10 animate-pulse" />
                    <div className="h-3 w-3/4 rounded bg-[var(--theme-color)]/10 animate-pulse" />
                  </div>
                  <div className="mt-auto space-y-4">
                    <div className="h-16 rounded-2xl bg-[var(--theme-color)]/10 animate-pulse" />
                    <div className="h-4 w-full rounded bg-[var(--theme-color)]/10 animate-pulse" />
                    <div className="h-10 w-full rounded-xl bg-[var(--theme-color)]/20 animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Mobile: 2 columns minimalist layout */}
          <div className="grid grid-cols-2 gap-4 md:hidden">
            {prioritizedProducts.map((product) => (
              <MobileProductCardItem key={product.id} product={product} />
            ))}
          </div>

          <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {prioritizedProducts.map((product) => (
              <DesktopProductCardItem key={product.id} product={product} />
            ))}
          </div>

          {prioritizedProducts.length === 0 && !isLoading ? (
            <div className="rounded-lg bg-[#F4F4F5] p-10 text-center text-sm text-[#6B7280]">
              ไม่พบสินค้าที่ตรงกับการค้นหา
            </div>
          ) : null}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--theme-color)]/30 px-4 py-5 sm:px-6 bg-white/50 rounded-lg mt-6">
              <div className="flex flex-1 justify-between sm:hidden gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (currentPage > 1) {
                      setCurrentPage(currentPage - 1)
                    }
                  }}
                  disabled={currentPage === 1 || isLoading}
                  className="border-[var(--theme-color)]/40 text-[var(--theme-color)] hover:bg-[var(--theme-color)]/10 hover:border-[var(--theme-color)] disabled:opacity-50 disabled:cursor-not-allowed"
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
                  disabled={currentPage === totalPages || isLoading}
                  className="border-[var(--theme-color)]/40 text-[var(--theme-color)] hover:bg-[var(--theme-color)]/10 hover:border-[var(--theme-color)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ถัดไป
                </Button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-[#9a5832]">
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
                    disabled={currentPage === 1 || isLoading}
                    className="border-[var(--theme-color)]/40 text-[var(--theme-color)] hover:bg-[var(--theme-color)]/10 hover:border-[var(--theme-color)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="size-4" />
                    ก่อนหน้า
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, index) => {
                      if (page === '...') {
                        return (
                          <span key={`ellipsis-${index}`} className="px-2 text-sm text-[#9a5832]">
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
                          disabled={isLoading}
                          className={
                            currentPage === pageNum
                              ? 'bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)] border-[var(--theme-color)]'
                              : 'border-[var(--theme-color)]/40 text-[var(--theme-color)] hover:bg-[var(--theme-color)]/10 hover:border-[var(--theme-color)]'
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
                    disabled={currentPage === totalPages || isLoading}
                    className="border-[var(--theme-color)]/40 text-[var(--theme-color)] hover:bg-[var(--theme-color)]/10 hover:border-[var(--theme-color)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ถัดไป
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  </div>
)
}

function MobileProductCardItem({ product }: { product: ProductCard }) {
  const { stock, badge, isPublished, isOutOfStock, price, priceVip, priceWalkin } = useLiveProductStock(
    product.id,
    product.stock,
    product.badge,
    product.price,
    product.priceVip,
    product.priceWalkin
  );

  return (
    <Card
      className={cn(
        "group relative flex h-full flex-col border shadow-sm transition-all",
        isOutOfStock
          ? "border-[#D1D5DB]/60 bg-gray-50/95 grayscale hover:shadow-sm hover:border-[#D1D5DB]"
          : "border-[var(--theme-color)]/30 bg-white/95 hover:shadow-md hover:border-[var(--theme-color)]/40"
      )}
    >
      {isOutOfStock && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <Badge className="bg-gray-600 text-white text-xs font-semibold px-3 py-1.5 shadow-lg">
            สินค้าหมด
          </Badge>
        </div>
      )}
      {priceVip != null && (
        <VipBadge />
      )}
      <CardContent className="flex flex-col items-center h-full p-5 text-center">
        <div className="relative mb-4 w-full overflow-hidden rounded-2xl aspect-square">
          {product.imageUrl || product.fallbackImageUrl ? (
            <FallbackImage
              src={product.imageUrl ?? product.fallbackImageUrl ?? '/logos/default.svg'}
              fallbackSrc={product.fallbackImageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              unoptimized
            />
          ) : null}
        </div>
        <CardTitle className={cn(
          "text-center text-base font-semibold leading-tight whitespace-pre-line break-words mb-auto min-h-[3rem]",
          isOutOfStock ? "text-gray-500" : "text-[#0B0B0B]"
        )}>
          {normalizeNewlines(product.name)}
        </CardTitle>
        <div className="flex flex-col items-center gap-2 mt-auto pt-4 w-full">
          <ProductPriceDisplay
            price={price}
            priceVip={priceVip}
            priceWalkin={priceWalkin}
            isOutOfStock={isOutOfStock}
          />
          <div className="w-full text-center text-xs text-[#6B7280]">
            <span>
              {isPublished ? (
                <>สต็อก: <span className="font-semibold text-[#0B0B0B]">{stock != null ? stock.toLocaleString() : 0}</span> ชิ้น</>
              ) : (
                <span className="font-semibold text-gray-500">สินค้าปิดการขาย</span>
              )}
            </span>
          </div>
          <PurchaseProductButton
            typeId={product.typeId}
            productName={product.name}
            productDescription={product.details}
            price={price}
            priceVip={priceVip}
            priceWalkin={priceWalkin}
            stock={stock}
            className="w-full rounded-lg text-sm py-2"
            disabled={isOutOfStock}
          >
            ซื้อทันที
          </PurchaseProductButton>
        </div>
      </CardContent>
    </Card>
  );
}

function DesktopProductCardItem({ product }: { product: ProductCard }) {
  const { stock, badge, isPublished, isOutOfStock, price, priceVip, priceWalkin } = useLiveProductStock(
    product.id,
    product.stock,
    product.badge,
    product.price,
    product.priceVip,
    product.priceWalkin
  );

  return (
    <Card
      className={cn(
        "group relative flex h-full flex-col border shadow-sm shadow-black/5 transition-all",
        isOutOfStock
          ? "border-[#D1D5DB]/80 bg-gray-50 grayscale hover:shadow-sm hover:border-[#D1D5DB]"
          : "border-[var(--theme-color)]/30 bg-white hover:shadow-md hover:border-[var(--theme-color)]/40"
      )}
    >
      {/* Badge มุมบน */}
      {badge === 'hot_sale' && !isOutOfStock ? (
        <Badge className="absolute right-4 top-4 z-10 bg-red-500 text-white text-xs font-semibold px-2 py-0.5 shadow-sm">
          HOT SALE
        </Badge>
      ) : badge === 'recommended' && !isOutOfStock ? (
        <Badge className="absolute left-4 top-4 z-10 bg-green-500 text-white text-xs font-semibold px-2 py-0.5 shadow-sm">
          แนะนำ
        </Badge>
      ) : null}
      {priceVip != null && (
        <VipBadge />
      )}
      
      {isOutOfStock && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <Badge className="bg-gray-600 text-white text-sm font-semibold px-4 py-2 shadow-lg">
            สินค้าหมด
          </Badge>
        </div>
      )}
      
      <CardContent className="gap-6 py-6 flex h-full flex-col">
        <CardHeader className="flex flex-row items-start gap-4 px-0 pt-0">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[#F4F4F5]">
            {product.imageUrl || product.fallbackImageUrl ? (
              <FallbackImage
                src={product.imageUrl ?? product.fallbackImageUrl ?? '/logos/default.svg'}
                fallbackSrc={product.fallbackImageUrl}
                alt={product.name}
                fill
                sizes="64px"
                className="object-contain p-2"
                unoptimized
              />
            ) : null}
          </div>
          <div className="flex-1 min-w-0 pr-12">
            <CardTitle className={cn(
              "text-lg font-semibold whitespace-pre-line break-words leading-tight mb-2",
              isOutOfStock ? "text-gray-500" : "text-[#0B0B0B]"
            )}>
              {normalizeNewlines(product.name)}
            </CardTitle>
            {product.typeMenu ? (
              <Badge variant="secondary" className={cn(
                "text-xs",
                isOutOfStock ? "bg-gray-200 text-gray-500" : "bg-[var(--theme-color)]/10 text-[var(--theme-color)]"
              )}>
                {product.typeMenu.toUpperCase()}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        
        <div className="flex-1 space-y-3 px-0">
          {product.details ? (
            <p className={cn(
              "text-sm whitespace-pre-line line-clamp-4 leading-relaxed",
              isOutOfStock ? "text-gray-400" : "text-[#555555]"
            )}>
              {normalizeNewlines(product.details.replace(/<[^>]+>/g, ''))}
            </p>
          ) : null}
        </div>

        <div className="mt-auto space-y-4 px-0">
          <div className="flex items-center justify-between rounded-2xl bg-[#F9FAFB] px-4 py-3">
            <div className="flex-1">
              <ProductPriceDisplay
                price={price}
                priceVip={priceVip}
                priceWalkin={priceWalkin}
                isOutOfStock={isOutOfStock}
                className="text-xl font-semibold"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span>
              {isPublished ? (
                <>สต็อก: {stock != null ? stock.toLocaleString() : 0} ชิ้น</>
              ) : (
                <span className="text-gray-500">สินค้าปิดการขาย</span>
              )}
            </span>
            <span className="text-[#9CA3AF]">รหัส: {product.typeId}</span>
          </div>
          
          <PurchaseProductButton
            typeId={product.typeId}
            productName={product.name}
            productDescription={product.details}
            price={price}
            priceVip={priceVip}
            priceWalkin={priceWalkin}
            stock={stock}
            className="w-full rounded-xl"
            disabled={isOutOfStock}
          >
            ซื้อทันที
          </PurchaseProductButton>
        </div>
      </CardContent>
    </Card>
  );
}

