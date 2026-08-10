'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { cn, normalizeNewlines } from '@/lib/utils'
import { PurchaseProductButton } from '@/components/orders/purchase-product-button'
import { Button } from '@/components/ui/button'
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
}

type ProductsGridProps = {
  products: ProductCard[]
}

export default function ProductsGrid({ products }: ProductsGridProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด')

  const categories = useMemo(() => {
    const map = new Map<string, string | null>()
    products.forEach((product) => {
      if (product.typeMenu) {
        map.set(product.typeMenu, product.typeImageUrl ?? product.imageUrl)
      }
    })
    return ['ทั้งหมด', ...Array.from(map.keys()).sort()]
  }, [products])

  const categoryImage = useMemo(() => {
    const map = new Map<string, { imageUrl: string | null; fallbackImageUrl: string | null }>()
    products.forEach((product) => {
      if (product.typeMenu) {
        map.set(product.typeMenu, {
          imageUrl: product.typeImageUrl ?? product.imageUrl,
          fallbackImageUrl: product.fallbackImageUrl ?? null,
        })
      }
    })
    return map
  }, [products])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === 'ทั้งหมด' || product.typeMenu === selectedCategory
      const matchesSearch = product.name
        .toLowerCase()
        .includes(searchTerm.trim().toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [products, searchTerm, selectedCategory])

  const prioritizedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      const aOut = (a.stock ?? 0) <= 0
      const bOut = (b.stock ?? 0) <= 0
      if (aOut === bOut) {
        return 0
      }
      return aOut ? 1 : -1
    })
  }, [filteredProducts])

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex w-full flex-col gap-3 rounded-2xl border border-[var(--theme-color)]/20 bg-white p-4 shadow-sm shadow-[var(--theme-color)40] sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-[var(--theme-color)]/10 text-[var(--theme-color)]">
              <Search className="size-5" />
            </span>
            <span className="text-sm font-semibold text-[#0B0B0B]">ค้นหา</span>
          </div>
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="พิมพ์ชื่อสินค้า เช่น Netflix"
            className="w-full border-none bg-[#F9FAFB] text-sm focus-visible:ring-[var(--theme-color)]"
          />
          <Button
            type="button"
            className="bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)] hover:text-white"
            onClick={() => setSearchTerm('')}
          >
            ล้างคำค้น
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
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
              <div className="flex items-center gap-2">
                {category !== 'ทั้งหมด' ? (
                  <span className="relative flex size-6 items-center justify-center overflow-hidden rounded-full bg-white/60">
                    {categoryImage.get(category)?.imageUrl || categoryImage.get(category)?.fallbackImageUrl ? (
                      <FallbackImage
                        src={categoryImage.get(category)!.imageUrl ?? categoryImage.get(category)!.fallbackImageUrl ?? '/logos/default.svg'}
                        fallbackSrc={categoryImage.get(category)!.fallbackImageUrl}
                        alt={category}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    ) : null}
                  </span>
                ) : null}
                <span>{category}</span>
              </div>
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 items-stretch">
        {prioritizedProducts.map((product) => (
          <Card
            key={product.id}
            className="flex h-full flex-col border-transparent bg-white shadow-lg shadow-black/5"
          >
            <CardHeader className="flex flex-row items-start gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[#F4F4F5]">
                {product.imageUrl || product.fallbackImageUrl ? (
                  <FallbackImage
                    src={product.imageUrl ?? product.fallbackImageUrl ?? '/logos/default.svg'}
                    fallbackSrc={product.fallbackImageUrl}
                    alt={product.name}
                    fill
                    sizes="64px"
                    className="object-contain"
                    unoptimized
                  />
                ) : null}
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-[#0B0B0B] whitespace-pre-line line-clamp-2">
                  {normalizeNewlines(product.name)}
                </CardTitle>
                {product.typeMenu ? (
                  <Badge className="mt-1 bg-[var(--theme-color)]/10 text-[var(--theme-color)]">
                    {product.typeMenu}
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              <div className="flex-1 space-y-4">
                {product.details ? (
                  <p className="line-clamp-3 text-sm text-[#555555] whitespace-pre-line">
                    {normalizeNewlines(product.details.replace(/<[^>]+>/g, ''))}
                  </p>
                ) : null}
              </div>
              <div className="mt-auto space-y-4">
                <div className="flex items-center justify-between rounded-2xl bg-[#F9FAFB] px-4 py-3">
                  <div>
                    <p className="text-xs text-[#6B7280]">พ้อยท์ที่ใช้</p>
                    <p className="text-xl font-semibold text-[#0B0B0B]">
                      {product.price != null ? (product.price === 0 ? "ฟรี" : `${product.price.toLocaleString("th-TH", { minimumFractionDigits: 2 })} พ้อยท์`) : '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-[#6B7280]">
                  <span>สต็อก: {product.stock != null ? product.stock.toLocaleString() : 0} ชิ้น</span>
                  <span>รหัส: {product.typeId}</span>
                </div>
                <PurchaseProductButton
                  typeId={product.typeId}
                  productName={product.name}
                  productDescription={product.details}
                  price={product.price}
                  priceVip={product.priceVip}
                  priceWalkin={product.priceWalkin}
                  stock={product.stock}
                  className="rounded-xl"
                >
                  ซื้อทันที
                </PurchaseProductButton>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {prioritizedProducts.length === 0 ? (
        <div className="rounded-2xl bg-[#F4F4F5] p-10 text-center text-sm text-[#6B7280]">
          ไม่พบสินค้าที่ตรงกับการค้นหา
        </div>
      ) : null}
    </div>
  )
}
