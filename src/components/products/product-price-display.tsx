'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useSession } from '@/lib/auth/use-session'
import { getPriceByTier } from '@/lib/utils/pricing'

type ProductPriceDisplayProps = {
  price: number | null
  priceVip: number | null
  priceWalkin?: number | null
  isOutOfStock?: boolean
  className?: string
}

export function ProductPriceDisplay({
  price,
  priceVip,
  priceWalkin,
  isOutOfStock = false,
  className,
}: ProductPriceDisplayProps) {
  const { user } = useSession()
  const userTier = user?.tier ?? 'normal'

  const effectivePrice = useMemo(() => {
    return getPriceByTier(price, priceVip, priceWalkin, userTier)
  }, [price, priceVip, priceWalkin, userTier])

  // แสดงราคาตาม tier โดยไม่แสดงขีดฆ่าหรือ badge เพื่อให้การ์ดดูสวยงาม
  if (effectivePrice == null) {
    return (
      <p className={cn(
        "text-xl font-bold",
        isOutOfStock ? "text-gray-500" : "text-[var(--theme-color)]",
        className
      )}>
        -
      </p>
    )
  }

  // แสดงแค่ราคาเดียวตาม tier
  return (
    <p className={cn(
      "text-xl font-bold",
      isOutOfStock ? "text-gray-500" : "text-[var(--theme-color)]",
      className
    )}>
      {effectivePrice === 0 ? "ฟรี" : `฿${effectivePrice.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`}
    </p>
  )
}

