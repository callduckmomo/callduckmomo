'use client'

import { useSession } from '@/lib/auth/use-session'
import { Badge } from '@/components/ui/badge'

export function VipBadge() {
  const { user } = useSession()
  const isVipUser = user?.tier === 'vip'

  if (!isVipUser) {
    return null
  }

  return (
    <Badge className="absolute right-2 top-2 z-10 bg-purple-500 text-white text-xs font-semibold px-2 py-0.5 shadow-sm">
      VIP
    </Badge>
  )
}

