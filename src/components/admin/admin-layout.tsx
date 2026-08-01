'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Users,
  Package,
  Settings,
  TrendingUp,
  DollarSign,
  Server,
  FileText,
  Warehouse,
  MessageSquare,
  Wallet,
  Gift,
} from 'lucide-react'
import UsersTable from '@/components/admin/users-table'
import CategoriesTable from '@/components/admin/categories-table'
import ProductsTable from '@/components/admin/products-table'
import LocalProductsTable from '@/components/admin/local-products-table'
import MasterProductsTable from '@/components/admin/master-products-table'
import LocalStockManagementTable from '@/components/admin/local-stock-management-table'
import StockManagementTable from '@/components/admin/stock-management-table'
import SettingsTable from '@/components/admin/settings-table'
import LogSettingsTable from '@/components/admin/log-settings-table'
import SalesHistoryTable from '@/components/admin/sales-history-table'
import RevenueHistoryTable from '@/components/admin/revenue-history-table'
import SupportCasesTable from '@/components/admin/support-cases-table'
import DiscountSettingsTable from '@/components/admin/discount-settings-table'
import TopupSummaryTable from '@/components/admin/topup-summary-table'
import GiftRulesTable from '@/components/admin/gift-rules-table'
import ApiProvidersTable from '@/components/admin/api-providers-table'
import { useSession } from '@/lib/auth/use-session'
import { Percent, Plug } from 'lucide-react'

// เมนูสำหรับ admin ปกติ
const ADMIN_MENU_ITEMS = [
  { id: 'users', label: 'ผู้ใช้', icon: Users },
  { id: 'support', label: 'เคสแจ้งปัญหา', icon: MessageSquare },
  { id: 'categories', label: 'หมวดหมู่', icon: Package },
  { id: 'products', label: 'สินค้า', icon: Package },
  { id: 'stock', label: 'จัดการสต็อก', icon: Warehouse },
  { id: 'discount', label: 'จัดการส่วนลด', icon: Percent },
  { id: 'sales', label: 'ประวัติการขาย', icon: TrendingUp },
  { id: 'revenue', label: 'สรุปยอด', icon: DollarSign },
  { id: 'topups', label: 'ประวัติการเติมเงิน', icon: Wallet },
] as const

// เมนูสำหรับ superadmin (full access)
const SUPERADMIN_MENU_ITEMS = [
  { id: 'users', label: 'ผู้ใช้', icon: Users },
  { id: 'categories', label: 'หมวดหมู่', icon: Package },
  { id: 'products', label: 'สินค้า', icon: Package },
  { id: 'stock', label: 'จัดการสต็อก', icon: Warehouse },
  { id: 'support', label: 'เคสแจ้งปัญหา', icon: MessageSquare },
  { id: 'discount', label: 'จัดการส่วนลด', icon: Percent },
  { id: 'sales', label: 'ประวัติการขาย', icon: TrendingUp },
  { id: 'gifts', label: 'ของแถม', icon: Gift },
  { id: 'topups', label: 'รายงานเติมเงิน', icon: Wallet },
  { id: 'revenue', label: 'สรุปยอด', icon: DollarSign },
  { id: 'api-providers', label: 'จัดการ API Providers', icon: Plug },
  { id: 'settings', label: 'ตั้งค่าเว็บไซต์', icon: Settings },
  { id: 'log', label: 'ตั้งค่า Log', icon: FileText },
] as const

const CHILD_ADMIN_MENU_ITEMS = [
  { id: 'users', label: 'จัดการผู้ใช้', icon: Users },
  { id: 'support', label: 'แจ้งปัญหา', icon: MessageSquare },
  { id: 'local-products', label: 'จัดการสินค้าภายในร้าน', icon: Package },
  { id: 'local-stock', label: 'จัดการสต๊อกสินค้าภายในร้าน', icon: Package },
  { id: 'products', label: 'จัดการราคาสินค้าของร้านหลัก', icon: Package },
  { id: 'sales', label: 'ประวัติการขาย', icon: TrendingUp },
  { id: 'topups', label: 'ประวัติเติมเงิน', icon: Wallet },
  { id: 'revenue', label: 'สรุปรายรับ/ยอดขาย', icon: DollarSign },
  { id: 'settings', label: 'ตั้งค่าเว็บไซต์', icon: Settings },
] as const

type MenuId = typeof SUPERADMIN_MENU_ITEMS[number]['id'] | typeof ADMIN_MENU_ITEMS[number]['id'] | typeof CHILD_ADMIN_MENU_ITEMS[number]['id']

export default function AdminLayout() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useSession()
  
  // ตรวจสอบ role ของผู้ใช้
  const isSuperAdmin = user?.role === 'superadmin' || (user?.isAdmin && !user?.role)
  const isAdmin = user?.role === 'admin' || isSuperAdmin
  
  // เลือกเมนูตาม role และไซต์
  const isChildSite = Boolean(process.env.NEXT_PUBLIC_SITE_ID && process.env.NEXT_PUBLIC_SITE_ID !== 'main')
  
  const MENU_ITEMS = isChildSite 
    ? CHILD_ADMIN_MENU_ITEMS 
    : (isSuperAdmin ? SUPERADMIN_MENU_ITEMS : ADMIN_MENU_ITEMS)
  
  // Initialize from URL params
  const menuFromUrl = (() => {
    const menu = searchParams.get('menu') as MenuId | null
    if (menu && MENU_ITEMS.some((item) => item.id === menu)) {
      return menu
    }
    // Default menu ตาม role
    if (isChildSite) return 'users'
    return isSuperAdmin ? 'users' : 'support'
  })()
  
  const [activeMenu, setActiveMenu] = useState<MenuId>(menuFromUrl)

  useEffect(() => {
    const menu = searchParams.get('menu') as MenuId | null
    if (menu && MENU_ITEMS.some((item) => item.id === menu) && menu !== activeMenu) {
      setActiveMenu(menu)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, MENU_ITEMS])

  const handleMenuClick = (menuId: MenuId) => {
    setActiveMenu(menuId)
    router.push(`/admin?menu=${menuId}`, { scroll: false })
  }

  const renderContent = () => {
    switch (activeMenu) {
      case 'users':
        return (
          <Card className="border-transparent bg-white/95 shadow-lg shadow-black/5">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-xl text-[#0B0B0B]">จัดการผู้ใช้</CardTitle>
                <p className="text-sm text-[#9a5832]">
                  ค้นหาและปรับสิทธิ์การใช้งานให้เหมาะสมกับบทบาทของผู้ใช้
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <UsersTable isChildSite={isChildSite} />
            </CardContent>
          </Card>
        )
      case 'categories':
        return (
          <Card className="border-transparent bg-white/95 shadow-lg shadow-black/5">
            <CardHeader>
              <CardTitle className="text-xl text-[#0B0B0B]">จัดการหมวดหมู่</CardTitle>
              <p className="text-sm text-[#9a5832]">
                เพิ่ม แก้ไข และลบหมวดหมู่สินค้า
              </p>
            </CardHeader>
            <CardContent>
              <CategoriesTable />
            </CardContent>
          </Card>
        )
      case 'products':
        return (
          <Card className="border-transparent bg-white/95 shadow-lg shadow-black/5">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-xl text-[#0B0B0B]">จัดการราคาสินค้าของร้านหลัก</CardTitle>
                <p className="text-sm text-[#9a5832]">
                  กำหนดราคาขายบนหน้าร้านของคุณ สำหรับสินค้าที่ดึงมาจากร้านหลัก
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <MasterProductsTable />
            </CardContent>
          </Card>
        )
      case 'local-products':
        return (
          <Card className="border-transparent bg-white/95 shadow-lg shadow-black/5">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-xl text-[#0B0B0B]">จัดการสินค้าภายในร้าน</CardTitle>
                <p className="text-sm text-[#9a5832]">
                  เพิ่ม แก้ไข และลบสินค้าเฉพาะภายในร้านของคุณเท่านั้น
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <LocalProductsTable />
            </CardContent>
          </Card>
        )
      case 'local-stock':
        return (
          <Card className="border-transparent bg-white/95 shadow-lg shadow-black/5">
            <CardHeader>
              <CardTitle className="text-xl text-[#0B0B0B]">จัดการสต๊อกสินค้าภายในร้าน</CardTitle>
              <p className="text-sm text-[#9a5832]">
                ดูและจัดการสต๊อกสินค้า (ไอดีเกม, รหัสผ่าน ฯลฯ) ภายในร้านของคุณ
              </p>
            </CardHeader>
            <CardContent>
              <LocalStockManagementTable />
            </CardContent>
          </Card>
        )
      case 'stock':
        return (
          <Card className="border-transparent bg-white/95 shadow-lg shadow-black/5">
            <CardHeader>
              <CardTitle className="text-xl text-[#0B0B0B]">จัดการสต็อก</CardTitle>
              <p className="text-sm text-[#9a5832]">
                จัดการรายละเอียดบัญชี (Email และ Password) สำหรับแต่ละสินค้า
              </p>
            </CardHeader>
            <CardContent>
              <StockManagementTable />
            </CardContent>
          </Card>
        )
      case 'support':
        return (
          <Card className="border-transparent bg-white/95 shadow-lg shadow-black/5">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-xl text-[#0B0B0B]">จัดการเคสแจ้งปัญหา</CardTitle>
                <p className="text-sm text-[#9a5832]">
                  ติดตามและจัดการเคสแจ้งปัญหาจากลูกค้า
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <SupportCasesTable />
            </CardContent>
          </Card>
        )
      case 'sales':
        return (
          <div className="space-y-6">
            <Card className="border-transparent bg-white/95 shadow-lg shadow-black/5">
              <CardContent className="pt-6">
                <SalesHistoryTable isLocal={false} />
              </CardContent>
            </Card>
            <Card className="border-transparent bg-white/95 shadow-lg shadow-black/5">
              <CardContent className="pt-6">
                <SalesHistoryTable isLocal={true} />
              </CardContent>
            </Card>
          </div>
        )
      case 'revenue':
        return (
          <div className="space-y-6">
            <Card className="border-transparent bg-white/95 shadow-lg shadow-black/5">
              <CardContent className="pt-6">
                <RevenueHistoryTable isLocal={false} />
              </CardContent>
            </Card>
            <Card className="border-transparent bg-white/95 shadow-lg shadow-black/5">
              <CardContent className="pt-6">
                <RevenueHistoryTable isLocal={true} />
              </CardContent>
            </Card>
          </div>
        )
      case 'topups':
        return (
          <Card className="border-transparent bg-white/95 shadow-lg shadow-black/5">
            <CardHeader>
              <CardTitle className="text-xl text-[#0B0B0B]">ประวัติการเติมเงิน</CardTitle>
              <p className="text-sm text-[#9a5832]">
                ดูยอดเติมเงินย้อนหลัง แยกตามลูกค้า พร้อมยอดรวมและตัวกรองช่วงเวลา
              </p>
            </CardHeader>
            <CardContent>
              <TopupSummaryTable />
            </CardContent>
          </Card>
        )
      case 'gifts':
        if (!isSuperAdmin) {
          return null
        }
        return (
          <Card className="border-transparent bg-white/95 shadow-lg shadow-black/5">
            <CardHeader>
              <CardTitle className="text-xl text-[#0B0B0B]">ของแถม</CardTitle>
              <p className="text-sm text-[#9a5832]">
                กำหนดของแถมที่ลูกค้าสามารถเลือกได้ตอนสั่งซื้อ โดยอิงจากสินค้าในร้านค้า
              </p>
            </CardHeader>
            <CardContent>
              <GiftRulesTable />
            </CardContent>
          </Card>
        )
      case 'discount':
        return (
          <Card className="border-transparent bg-white/95 shadow-lg shadow-black/5">
            <CardHeader>
              <CardTitle className="text-xl text-[#0B0B0B]">จัดการส่วนลด</CardTitle>
              <p className="text-sm text-[#9a5832]">
                ตั้งค่าเปอร์เซ็นต์ส่วนลดที่แสดงในราคาเดิม
              </p>
            </CardHeader>
            <CardContent>
              <DiscountSettingsTable />
            </CardContent>
          </Card>
        )
      case 'settings':
        // superadmin หรือ admin ของเว็ปลูกเท่านั้นที่เห็นเมนูนี้
        if (!isSuperAdmin && !isChildSite) {
          return null
        }
        return (
          <Card className="border-transparent bg-white/95 shadow-lg shadow-black/5">
            <CardHeader>
              <CardTitle className="text-xl text-[#0B0B0B]">ตั้งค่าเว็บไซต์</CardTitle>
              <p className="text-sm text-[#9a5832]">
                จัดการการตั้งค่าเว็บไซต์
              </p>
            </CardHeader>
            <CardContent>
              <SettingsTable />
            </CardContent>
          </Card>
        )
      case 'api-providers':
        // เฉพาะ superadmin เท่านั้นที่เห็นเมนูนี้
        if (!isSuperAdmin) {
          return null
        }
        return (
          <Card className="border-transparent bg-white/95 shadow-lg shadow-black/5">
            <CardHeader>
              <CardTitle className="text-xl text-[#0B0B0B]">จัดการ API Providers</CardTitle>
              <p className="text-sm text-[#9a5832]">
                ตั้งค่า API Providers สำหรับเชื่อมต่อระบบภายนอก (เช่น RDCW)
              </p>
            </CardHeader>
            <CardContent>
              <ApiProvidersTable />
            </CardContent>
          </Card>
        )
      case 'log':
        // เฉพาะ superadmin เท่านั้นที่เห็นเมนูนี้
        if (!isSuperAdmin) {
          return null
        }
        return (
          <Card className="border-transparent bg-white/95 shadow-lg shadow-black/5">
            <CardHeader>
              <CardTitle className="text-xl text-[#0B0B0B]">ตั้งค่า Log</CardTitle>
              <p className="text-sm text-[#9a5832]">
                ตั้งค่า Discord webhook URLs สำหรับแจ้งเตือนการเติมพ้อย การซื้อสินค้า และ Admin Actions
              </p>
            </CardHeader>
            <CardContent>
              <LogSettingsTable />
            </CardContent>
          </Card>
        )
      default:
        return null
    }
  }

  return (
    <section className="min-h-screen bg-[var(--theme-color-bg-bottom)] pt-4 pb-8 sm:pt-6 sm:pb-12">
      <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Sidebar */}
          <aside className="w-full lg:w-64 lg:shrink-0">
            <Card className="sticky top-24 rounded-lg border border-[#fed7aa]/60 bg-white/95 shadow-sm shadow-[var(--theme-color)]/10">
              <CardContent className="p-2">
                <nav className="flex flex-row overflow-x-auto gap-2 pb-2 lg:flex-col lg:space-y-1 lg:gap-0 lg:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {MENU_ITEMS.map((item) => {
                    const Icon = item.icon
                    const isActive = activeMenu === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleMenuClick(item.id)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors whitespace-nowrap shrink-0 lg:w-full lg:shrink',
                          isActive
                            ? 'bg-[var(--theme-color)]/10 text-[var(--theme-color)]'
                            : 'text-[#0B0B0B] hover:bg-[#F9FAFB]'
                        )}
                      >
                        <Icon className={cn('size-4 shrink-0', isActive ? 'text-[var(--theme-color)]' : 'text-[#9a5832]')} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </button>
                    )
                  })}
                </nav>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {renderContent()}
          </main>
        </div>
      </div>
    </section>
  )
}

