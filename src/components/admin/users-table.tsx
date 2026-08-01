'use client'

import { useEffect, useState, useTransition } from 'react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useSession, refreshSessionCache } from '@/lib/auth/use-session'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type UserRow = {
  id: string
  email: string
  display_name: string | null
  is_admin: boolean
  role?: 'user' | 'admin' | 'superadmin'
  is_active: boolean
  created_at: string
  points: number
  user_tier?: 'normal' | 'vip' | 'walkin'
  site_id: string
  is_api_enabled: boolean
  sites?: { site_id: string, is_api_enabled: boolean, id: string }[]
}

export default function UsersTable({ isChildSite }: { isChildSite?: boolean }) {
  const { user: sessionUser } = useSession()
  const isSuperAdmin = sessionUser?.role === 'superadmin' || (sessionUser?.isAdmin && !sessionUser?.role)

  const [users, setUsers] = useState<UserRow[]>([])
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState('')
  const [pointsDialogUser, setPointsDialogUser] = useState<UserRow | null>(null)
  const [pointsAdjust, setPointsAdjust] = useState('')
  const [pointsSet, setPointsSet] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)
  const [deleteDialogUser, setDeleteDialogUser] = useState<UserRow | null>(null)
  const [newUserData, setNewUserData] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'user' as 'user' | 'admin' | 'superadmin',
    userTier: 'normal' as 'normal' | 'vip' | 'walkin',
    points: '0',
    isActive: true,
  })
  const itemsPerPage = 50

  const fetchUsers = (q = '', page = 1) => {
    startTransition(async () => {
      const url = new URL('/api/admin/users', window.location.origin)
      if (q) url.searchParams.set('q', q)
      url.searchParams.set('limit', String(itemsPerPage))
      url.searchParams.set('offset', String((page - 1) * itemsPerPage))
      
      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) {
        toast.error('โหลดรายชื่อผู้ใช้ไม่สำเร็จ')
        return
      }
      const data = (await res.json()) as { 
        users: Array<UserRow & { points: number | null }>
        total?: number
        page?: number
        totalPages?: number
      }
      setUsers(
        data.users.map((user) => ({
          ...user,
          points: Number(user.points ?? 0),
          is_api_enabled: user.is_api_enabled ?? true,
        }))
      )
      if (data.total !== undefined) setTotal(data.total)
      if (data.page !== undefined) setCurrentPage(data.page)
      if (data.totalPages !== undefined) setTotalPages(data.totalPages)
    })
  }

  useEffect(() => {
    fetchUsers(query, currentPage)
  }, [currentPage])

  // Reset to page 1 when query changes and fetch with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query !== '') {
        setCurrentPage(1)
        fetchUsers(query, 1)
      } else {
        // ถ้า query ว่าง ให้ fetch หน้า 1
        setCurrentPage(1)
        fetchUsers('', 1)
      }
    }, 500) // debounce 500ms

    return () => clearTimeout(timer)
  }, [query])

  const updateRole = (user: UserRow, newRole: 'user' | 'admin' | 'superadmin') => {
    startTransition(async () => {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, role: newRole }),
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.message || 'อัปเดตสิทธิ์ไม่สำเร็จ')
        return
      }
      toast.success('อัปเดตสิทธิ์เรียบร้อย')
      fetchUsers(query, currentPage)
    })
  }

  const updateApiStatus = (user: UserRow, checked: boolean) => {
    startTransition(async () => {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, isApiEnabled: checked }),
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.message || 'อัปเดตสถานะ API ไม่สำเร็จ')
        return
      }
      toast.success(`อัปเดตสถานะ API เรียบร้อย`)
      fetchUsers(query, currentPage)
    })
  }

  const updateTier = (user: UserRow, newTier: 'normal' | 'vip' | 'walkin') => {
    startTransition(async () => {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, userTier: newTier }),
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.message || 'อัปเดต tier ไม่สำเร็จ')
        return
      }
      toast.success('อัปเดต tier เรียบร้อย')
      // Refresh session cache เพื่อให้ user ที่ถูกแก้ไขเห็น tier ใหม่ทันที
      refreshSessionCache()
      fetchUsers(query, currentPage)
    })
  }

  const toggleActive = (user: UserRow) => {
    startTransition(async () => {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, isActive: !user.is_active }),
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.message || 'อัปเดตสถานะไม่สำเร็จ')
        return
      }
      toast.success('อัปเดตสถานะเรียบร้อย')
      fetchUsers(query, currentPage)
    })
  }

  const openPointsDialog = (user: UserRow) => {
    setPointsDialogUser(user)
    setPointsAdjust('')
    setPointsSet('')
  }

  const closePointsDialog = () => {
    setPointsDialogUser(null)
    setPointsAdjust('')
    setPointsSet('')
  }

  const submitPointsUpdate = (user: UserRow, value: number, successMessage: string) => {
    const nextPoints = Math.max(0, Number(value))

    startTransition(async () => {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, points: nextPoints }),
        credentials: 'include',
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        toast.error(payload?.message ?? 'ไม่สามารถอัปเดตพ้อยท์ได้')
        return
      }

      toast.success(successMessage)
      closePointsDialog()
      fetchUsers(query, currentPage)
    })
  }

  const handleAdjustPoints = () => {
    if (!pointsDialogUser) return
    const raw = pointsAdjust.trim()
    if (!raw) {
      toast.error('กรุณากรอกจำนวนพ้อยท์ที่ต้องการเพิ่มหรือลด')
      return
    }

    const value = Number(raw)
    if (!Number.isFinite(value) || value === 0) {
      toast.error('จำนวนพ้อยท์ต้องเป็นตัวเลขและไม่เท่ากับ 0')
      return
    }

    const current = Number(pointsDialogUser.points ?? 0)
    const next = current + value
    submitPointsUpdate(
      pointsDialogUser,
      next,
      value > 0
        ? `เพิ่มพ้อยท์ให้ ${pointsDialogUser.email} จำนวน ${Number(value).toLocaleString("th-TH", { minimumFractionDigits: 2 })} พ้อยท์เรียบร้อย`
        : `ลดพ้อยท์ของ ${pointsDialogUser.email} จำนวน ${Number(Math.abs(value)).toLocaleString("th-TH", { minimumFractionDigits: 2 })} พ้อยท์เรียบร้อย`
    )
  }

  const handleSetPoints = () => {
    if (!pointsDialogUser) return
    const raw = pointsSet.trim()
    if (!raw) {
      toast.error('กรุณากรอกจำนวนพ้อยท์ที่ต้องการตั้งค่าใหม่')
      return
    }

    const value = Number(raw)
    if (!Number.isFinite(value) || value < 0) {
      toast.error('จำนวนพ้อยท์ต้องเป็นตัวเลขไม่ติดลบ')
      return
    }

    submitPointsUpdate(
      pointsDialogUser,
      value,
      `ตั้งค่าพ้อยท์ของ ${pointsDialogUser.email} เป็น ${Number(value).toLocaleString("th-TH", { minimumFractionDigits: 2 })} พ้อยท์เรียบร้อย`
    )
  }

  const handleAddUser = () => {
    startTransition(async () => {
      if (!newUserData.email || !newUserData.password || !newUserData.displayName) {
        toast.error('กรุณากรอกข้อมูลให้ครบถ้วน')
        return
      }

      const points = Number(newUserData.points)
      if (isNaN(points) || points < 0) {
        toast.error('จำนวนพ้อยท์ต้องเป็นตัวเลขไม่ติดลบ')
        return
      }

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUserData.email,
          password: newUserData.password,
          displayName: newUserData.displayName,
          role: newUserData.role,
          userTier: newUserData.userTier,
          points: points,
          isActive: newUserData.isActive,
        }),
        credentials: 'include',
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        toast.error(payload?.message ?? 'ไม่สามารถสร้างผู้ใช้ได้')
        return
      }

      toast.success('สร้างผู้ใช้ใหม่เรียบร้อย')
      setIsAddUserDialogOpen(false)
      setNewUserData({
        email: '',
        password: '',
        displayName: '',
        role: 'user',
        userTier: 'normal',
        points: '0',
        isActive: true,
      })
      fetchUsers(query, currentPage)
    })
  }

  const handleDeleteUser = () => {
    if (!deleteDialogUser) return

    startTransition(async () => {
      const res = await fetch(`/api/admin/users?id=${deleteDialogUser.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        toast.error(payload?.message ?? 'ไม่สามารถลบผู้ใช้ได้')
        return
      }

      toast.success(`ลบผู้ใช้ ${deleteDialogUser.email} เรียบร้อย`)
      setDeleteDialogUser(null)
      fetchUsers(query, currentPage)
    })
  }

  return (
    <div className="w-full space-y-4">
      {/* Search Box */}
      <div className="flex flex-col gap-3 rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[#0B0B0B]">ค้นหาผู้ใช้</span>
        </div>
        <Input
          id="user-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setCurrentPage(1)
              fetchUsers(query, 1)
            }
          }}
          placeholder="พิมพ์อีเมล เช่น user@example.com"
          className="w-full border-none bg-[#F9FAFB] text-sm focus-visible:ring-[var(--theme-color)] sm:flex-1"
        />
        <Button
          id="user-search-btn"
          type="button"
          className="bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)] hover:text-white"
          onClick={() => {
            setCurrentPage(1)
            fetchUsers(query, 1)
          }}
          disabled={isPending}
        >
          ค้นหา
        </Button>
        {query && (
          <Button
            type="button"
            variant="outline"
            className="border-[var(--theme-color)]/40 text-[var(--theme-color)] hover:border-[var(--theme-color)] hover:bg-[var(--theme-color)]/10"
            onClick={() => {
              setQuery('')
              setCurrentPage(1)
            }}
            disabled={isPending}
          >
            ล้าง
          </Button>
        )}
        <Button
          type="button"
          className="ml-auto bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)] hover:text-white"
          onClick={() => setIsAddUserDialogOpen(true)}
          disabled={isPending}
        >
          <Plus className="mr-2 size-4" />
          เพิ่มผู้ใช้
        </Button>
      </div>
      
    {/* Desktop Table View */}
    <div className="hidden md:block w-full overflow-x-auto">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead>
          <tr className="text-[#6B7280]">
            <th className="py-2 pr-2">อีเมล</th>
            <th className="py-2 pr-2">ชื่อแสดง</th>
            <th className="py-2 pr-2">บทบาท</th>
            {(!isChildSite || isSuperAdmin) && <th className="py-2 pr-2">Tier</th>}
            <th className="py-2 pr-2">สถานะ</th>
            {isSuperAdmin && <th className="py-2 pr-2 text-center">ไซต์ (API)</th>}
            <th className="py-2 pr-2 text-right">พ้อยท์</th>
            <th className="py-2 text-right">การจัดการ</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isTargetAdmin = u.role === 'admin' || u.role === 'superadmin' || u.is_admin
            const cannotEdit = !isSuperAdmin && isTargetAdmin

            return (
              <tr key={u.id} className="border-t border-[#E5E7EB]">
                <td className="py-2 pr-2 font-medium text-[#0B0B0B] break-all">{u.email}</td>
                <td className="py-2 pr-2 text-[#111827] break-words">{u.display_name ?? '-'}</td>
                <td className="py-2 pr-2">
                  <Select
                    value={u.role || (u.is_admin ? 'superadmin' : 'user')}
                    onValueChange={(value) => updateRole(u, value as 'user' | 'admin' | 'superadmin')}
                    disabled={isPending || cannotEdit}
                  >
                    <SelectTrigger className="w-[110px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      {isSuperAdmin && <SelectItem value="superadmin">Super Admin</SelectItem>}
                    </SelectContent>
                  </Select>
                </td>
                {(!isChildSite || isSuperAdmin) && (
                  <td className="py-2 pr-2">
                    <Select
                      value={u.user_tier || 'normal'}
                      onValueChange={(value) => updateTier(u, value as 'normal' | 'vip' | 'walkin')}
                      disabled={isPending || cannotEdit}
                    >
                      <SelectTrigger className="w-[90px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                        <SelectItem value="walkin">Walk-in</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                )}
                <td className="py-2 pr-2">
                  {u.is_active ? (
                    <Badge className="bg-emerald-500/10 text-emerald-700 text-[10px] px-1.5 py-0">Active</Badge>
                  ) : (
                    <Badge className="bg-zinc-200 text-zinc-700 text-[10px] px-1.5 py-0">Inactive</Badge>
                  )}
                </td>
                {isSuperAdmin && (
                  <td className="py-2 pr-2 text-center">
                    <div className="flex flex-col items-center gap-2">
                      {u.sites && u.sites.length > 0 ? (
                        u.sites.map(site => (
                          <div key={site.id} className="flex flex-col items-center gap-1 border-b border-zinc-100 last:border-0 pb-1 last:pb-0">
                            <Badge variant="outline" className="text-[10px] whitespace-nowrap bg-zinc-50">{site.site_id}</Badge>
                            {u.role === 'admin' || u.role === 'superadmin' || u.is_admin ? (
                              <div className="flex items-center gap-1">
                                <Switch
                                  checked={site.is_api_enabled}
                                  onCheckedChange={(checked) => {
                                    updateApiStatus({ ...u, id: site.id }, checked);
                                  }}
                                  disabled={isPending}
                                  className="scale-75 data-[state=checked]:bg-emerald-500"
                                />
                              </div>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <Badge variant="outline" className="text-[10px] whitespace-nowrap bg-zinc-50">{u.site_id}</Badge>
                          {u.site_id === 'main' && (u.role === 'admin' || u.role === 'superadmin' || u.is_admin) ? (
                            <div className="flex items-center gap-1">
                              <Switch
                                checked={u.is_api_enabled}
                                onCheckedChange={(checked) => updateApiStatus(u, checked)}
                                disabled={isPending}
                                className="scale-75 data-[state=checked]:bg-emerald-500"
                              />
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </td>
                )}
                <td className="py-2 pr-2 text-right text-[#0B0B0B]">
                  <div className="inline-flex flex-col items-end gap-0.5">
                    <span className="text-xs font-semibold whitespace-nowrap">
                      {u.points.toLocaleString("th-TH", { minimumFractionDigits: 2 })} พ้อยท์
                    </span>
                    <button
                      type="button"
                      className="text-[10px] text-[#9a5832] underline-offset-2 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => openPointsDialog(u)}
                      disabled={isPending || cannotEdit}
                    >
                      จัดการพ้อยท์
                    </button>
                  </div>
                </td>
                <td className="py-2 text-right">
                  <div className="flex justify-end gap-1 flex-wrap w-[100px] ml-auto">
                    <Button
                      size="sm"
                      className={cn(
                        'text-white transition-colors hover:text-white h-7 text-xs px-2 w-full',
                        u.is_active
                          ? 'bg-[var(--theme-color)] hover:bg-[var(--theme-color)]'
                          : 'bg-black hover:bg-[#1f1f1f]'
                      )}
                      onClick={() => toggleActive(u)}
                      disabled={isPending || cannotEdit}
                    >
                      {u.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500/40 text-red-600 hover:border-red-500 hover:bg-red-50 hover:text-red-700 h-7 text-xs px-2 w-full"
                      onClick={() => setDeleteDialogUser(u)}
                      disabled={isPending || cannotEdit}
                    >
                      <Trash2 className="size-3 mr-1" />
                      ลบ
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {users.length === 0 ? (
        <p className="py-6 text-center text-sm text-[#9a5832]">ไม่พบผู้ใช้</p>
      ) : null}
    </div>

    {/* Mobile Card View */}
    <div className="block md:hidden w-full divide-y divide-[#E5E7EB]">
      {users.length === 0 ? (
        <p className="py-6 text-center text-sm text-[#9a5832]">ไม่พบผู้ใช้</p>
      ) : (
        users.map((u) => {
          const isTargetAdmin = u.role === 'admin' || u.role === 'superadmin' || u.is_admin
          const cannotEdit = !isSuperAdmin && isTargetAdmin

          return (
            <div key={u.id} className="py-4 space-y-3 hover:bg-[#F9FAFB]/50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0B0B0B] break-all">{u.email}</p>
                  <p className="text-xs text-[#6B7280] truncate">{u.display_name || "-"}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {u.is_active ? (
                    <Badge className="bg-emerald-500/10 text-emerald-700 text-[10px] px-1.5 py-0">Active</Badge>
                  ) : (
                    <Badge className="bg-zinc-200 text-zinc-700 text-[10px] px-1.5 py-0">Inactive</Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <span className="text-[#6B7280] block font-medium">บทบาท</span>
                  <Select
                    value={u.role || (u.is_admin ? 'superadmin' : 'user')}
                    onValueChange={(value) => updateRole(u, value as 'user' | 'admin' | 'superadmin')}
                    disabled={isPending || cannotEdit}
                  >
                    <SelectTrigger className="w-full h-8 text-xs bg-white border-[#E5E7EB]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      {isSuperAdmin && <SelectItem value="superadmin">Super Admin</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>

                {(!isChildSite || isSuperAdmin) && (
                  <div className="space-y-1">
                    <span className="text-[#6B7280] block font-medium">Tier</span>
                    <Select
                      value={u.user_tier || 'normal'}
                      onValueChange={(value) => updateTier(u, value as 'normal' | 'vip' | 'walkin')}
                      disabled={isPending || cannotEdit}
                    >
                      <SelectTrigger className="w-full h-8 text-xs bg-white border-[#E5E7EB]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                        <SelectItem value="walkin">Walk-in</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {isSuperAdmin && (
                <div className="bg-[#F9FAFB] rounded-lg p-2.5 space-y-2 border border-[#E5E7EB]/50">
                  <span className="text-xs font-semibold text-[#374151] block">ไซต์ (API)</span>
                  <div className="grid grid-cols-2 gap-2">
                    {u.sites && u.sites.length > 0 ? (
                      u.sites.map(site => (
                        <div key={site.id} className="flex items-center justify-between bg-white border border-[#E5E7EB] rounded-md px-2 py-1">
                          <Badge variant="outline" className="text-[10px] bg-zinc-50">{site.site_id}</Badge>
                          {u.role === 'admin' || u.role === 'superadmin' || u.is_admin ? (
                            <Switch
                              checked={site.is_api_enabled}
                              onCheckedChange={(checked) => {
                                updateApiStatus({ ...u, id: site.id }, checked);
                              }}
                              disabled={isPending}
                              className="scale-75 data-[state=checked]:bg-emerald-500"
                            />
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-between bg-white border border-[#E5E7EB] rounded-md px-2 py-1 col-span-2">
                        <Badge variant="outline" className="text-[10px] bg-zinc-50">{u.site_id}</Badge>
                        {u.site_id === 'main' && (u.role === 'admin' || u.role === 'superadmin' || u.is_admin) ? (
                          <Switch
                            checked={u.is_api_enabled}
                            onCheckedChange={(checked) => updateApiStatus(u, checked)}
                            disabled={isPending}
                            className="scale-75 data-[state=checked]:bg-emerald-500"
                          />
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between border-t pt-2 border-[#E5E7EB]">
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#6B7280]">พ้อยท์สะสม</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-[#0B0B0B]">{u.points.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
                    <button
                      type="button"
                      className="text-[10px] text-[#9a5832] underline underline-offset-2 disabled:opacity-50"
                      onClick={() => openPointsDialog(u)}
                      disabled={isPending || cannotEdit}
                    >
                      จัดการพ้อยท์
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className={cn(
                      'text-white transition-colors hover:text-white h-8 text-xs px-2.5',
                      u.is_active
                        ? 'bg-[var(--theme-color)] hover:bg-[var(--theme-color)]'
                        : 'bg-black hover:bg-[#1f1f1f]'
                    )}
                    onClick={() => toggleActive(u)}
                    disabled={isPending || cannotEdit}
                  >
                    {u.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500/40 text-red-600 hover:border-red-500 hover:bg-red-50 hover:text-red-700 h-8 text-xs px-2"
                    onClick={() => setDeleteDialogUser(u)}
                    disabled={isPending || cannotEdit}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            </div>
          )
        })
      )}
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
                {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 7) {
                    pageNum = i + 1
                  } else if (currentPage <= 4) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 3) {
                    pageNum = totalPages - 6 + i
                  } else {
                    pageNum = currentPage - 3 + i
                  }
                  
                  if (totalPages > 7 && i === 0 && currentPage > 4) {
                    return (
                      <div key={`pagination-ellipsis-start-${i}`} className="flex items-center gap-1">
                        <Button
                          variant={currentPage === 1 ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(1)}
                          disabled={isPending}
                          className={
                            currentPage === 1
                              ? 'bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)]'
                              : 'border-[#E5E7EB]'
                          }
                        >
                          1
                        </Button>
                        <span className="px-2 text-sm text-[#6B7280]">...</span>
                      </div>
                    )
                  }
                  
                  if (totalPages > 7 && i === 6 && currentPage < totalPages - 3) {
                    return (
                      <div key={`pagination-ellipsis-end-${i}`} className="flex items-center gap-1">
                        <span className="px-2 text-sm text-[#6B7280]">...</span>
                        <Button
                          variant={currentPage === totalPages ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={isPending}
                          className={
                            currentPage === totalPages
                              ? 'bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)]'
                              : 'border-[#E5E7EB]'
                          }
                        >
                          {totalPages}
                        </Button>
                      </div>
                    )
                  }
                  
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
      
      <Dialog
        open={!!pointsDialogUser}
        onOpenChange={(open) => {
          if (!open) {
            closePointsDialog()
          }
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          {pointsDialogUser ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-[#0B0B0B]">
                  จัดการพ้อยท์ผู้ใช้
                </DialogTitle>
                <DialogDescription className="text-sm text-[#9a5832]">
                  ปรับพ้อยท์ของ {pointsDialogUser.email} ได้ทั้งการเพิ่ม/ลดหรือการตั้งค่าใหม่
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5 py-2">
                <div className="rounded-2xl bg-[#F4F4F5] p-4">
                  <p className="text-xs uppercase text-[#9a5832]">พ้อยท์ปัจจุบัน</p>
                  <p className="mt-1 text-lg font-semibold text-[#0B0B0B]">
                    {pointsDialogUser.points.toLocaleString("th-TH", { minimumFractionDigits: 2 })} พ้อยท์
                  </p>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="points-adjust" className="text-sm text-[#0B0B0B]">
                    เพิ่ม/ลดพ้อยท์ (ใส่ค่าบวกหรือลบ)
                  </Label>
                  <Input
                    id="points-adjust"
                    value={pointsAdjust}
                    onChange={(event) => setPointsAdjust(event.target.value)}
                    placeholder="เช่น 100 หรือ -50"
                    inputMode="decimal"
                    className="rounded-xl border-[var(--theme-color)]/30 focus-visible:ring-[var(--theme-color)]"
                    disabled={isPending}
                  />
                  <Button
                    type="button"
                    className="rounded-xl bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)]"
                    onClick={handleAdjustPoints}
                    disabled={isPending}
                  >
                    ยืนยันเพิ่ม/ลดพ้อยท์
                  </Button>
                </div>
                <div className="h-px w-full bg-[#E5E7EB]" />
                <div className="space-y-3">
                  <Label htmlFor="points-set" className="text-sm text-[#0B0B0B]">
                    ตั้งค่าพ้อยท์ใหม่ (จำนวนรวม)
                  </Label>
                  <Input
                    id="points-set"
                    value={pointsSet}
                    onChange={(event) => setPointsSet(event.target.value)}
                    placeholder="เช่น 500"
                    inputMode="decimal"
                    className="rounded-xl border-[var(--theme-color)]/30 focus-visible:ring-[var(--theme-color)]"
                    disabled={isPending}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl border-[var(--theme-color)]/40 text-[var(--theme-color)] hover:border-[var(--theme-color)] hover:bg-[var(--theme-color)]/10 hover:text-[var(--theme-color)]"
                    onClick={handleSetPoints}
                    disabled={isPending}
                  >
                    ตั้งค่าพ้อยท์ใหม่
                  </Button>
                </div>
              </div>
              <DialogFooter className="justify-end">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="rounded-xl" disabled={isPending}>
                    ปิดหน้าต่าง
                  </Button>
                </DialogClose>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[#0B0B0B]">
              เพิ่มผู้ใช้ใหม่
            </DialogTitle>
            <DialogDescription className="text-sm text-[#9a5832]">
              สร้างบัญชีผู้ใช้ใหม่ในระบบ
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-user-email" className="text-sm text-[#0B0B0B]">
                อีเมล <span className="text-[var(--theme-color)]">*</span>
              </Label>
              <Input
                id="new-user-email"
                type="email"
                value={newUserData.email}
                onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                placeholder="user@example.com"
                className="rounded-xl border-[var(--theme-color)]/30 focus-visible:ring-[var(--theme-color)]"
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-password" className="text-sm text-[#0B0B0B]">
                รหัสผ่าน <span className="text-[var(--theme-color)]">*</span>
              </Label>
              <Input
                id="new-user-password"
                type="password"
                value={newUserData.password}
                onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                placeholder="อย่างน้อย 8 ตัวอักษร"
                className="rounded-xl border-[var(--theme-color)]/30 focus-visible:ring-[var(--theme-color)]"
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-display-name" className="text-sm text-[#0B0B0B]">
                ชื่อแสดง <span className="text-[var(--theme-color)]">*</span>
              </Label>
              <Input
                id="new-user-display-name"
                type="text"
                value={newUserData.displayName}
                onChange={(e) => setNewUserData({ ...newUserData, displayName: e.target.value })}
                placeholder="ชื่อที่ต้องการให้แสดง"
                className="rounded-xl border-[var(--theme-color)]/30 focus-visible:ring-[var(--theme-color)]"
                disabled={isPending}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-user-role" className="text-sm text-[#0B0B0B]">
                  บทบาท
                </Label>
                <Select
                  value={newUserData.role}
                  onValueChange={(value) =>
                    setNewUserData({ ...newUserData, role: value as 'user' | 'admin' | 'superadmin' })
                  }
                  disabled={isPending}
                >
                  <SelectTrigger className="rounded-xl border-[var(--theme-color)]/30 focus:ring-[var(--theme-color)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    {isSuperAdmin && <SelectItem value="superadmin">Super Admin</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              {(!isChildSite || isSuperAdmin) && (
                <div className="space-y-2">
                  <Label htmlFor="new-user-tier" className="text-sm text-[#0B0B0B]">
                    Tier
                  </Label>
                  <Select
                    value={newUserData.userTier}
                    onValueChange={(value) =>
                      setNewUserData({ ...newUserData, userTier: value as 'normal' | 'vip' | 'walkin' })
                    }
                    disabled={isPending}
                  >
                    <SelectTrigger className="rounded-xl border-[var(--theme-color)]/30 focus:ring-[var(--theme-color)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="walkin">Walk-in</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-points" className="text-sm text-[#0B0B0B]">
                พ้อยท์เริ่มต้น
              </Label>
              <Input
                id="new-user-points"
                type="number"
                min="0"
                step="any"
                value={newUserData.points}
                onChange={(e) => setNewUserData({ ...newUserData, points: e.target.value })}
                placeholder="0"
                className="rounded-xl border-[var(--theme-color)]/30 focus-visible:ring-[var(--theme-color)]"
                disabled={isPending}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="new-user-active"
                checked={newUserData.isActive}
                onChange={(e) => setNewUserData({ ...newUserData, isActive: e.target.checked })}
                disabled={isPending}
                className="size-4 rounded border-[var(--theme-color)]/30 text-[var(--theme-color)] focus:ring-[var(--theme-color)]"
              />
              <Label htmlFor="new-user-active" className="text-sm text-[#0B0B0B] cursor-pointer">
                เปิดใช้งานทันที
              </Label>
            </div>
          </div>
          <DialogFooter className="justify-end gap-2">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={isPending}
                onClick={() => {
                  setNewUserData({
                    email: '',
                    password: '',
                    displayName: '',
                    role: 'user',
                    userTier: 'normal',
                    points: '0',
                    isActive: true,
                  })
                }}
              >
                ยกเลิก
              </Button>
            </DialogClose>
            <Button
              type="button"
              className="rounded-xl bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)]"
              onClick={handleAddUser}
              disabled={isPending}
            >
              {isPending ? 'กำลังสร้าง...' : 'สร้างผู้ใช้'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={!!deleteDialogUser} onOpenChange={(open) => {
        if (!open) {
          setDeleteDialogUser(null)
        }
      }}>
        <DialogContent className="sm:max-w-[420px]">
          {deleteDialogUser ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-[#0B0B0B]">
                  ยืนยันการลบผู้ใช้
                </DialogTitle>
                <DialogDescription className="text-sm text-[#9a5832]">
                  คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้ <span className="font-semibold text-[#0B0B0B]">{deleteDialogUser.email}</span>? การกระทำนี้ไม่สามารถยกเลิกได้
                </DialogDescription>
              </DialogHeader>
              <div className="py-2">
                <div className="rounded-2xl bg-red-50 p-4">
                  <p className="text-sm text-red-700">
                    การลบผู้ใช้นี้จะลบข้อมูลทั้งหมดที่เกี่ยวข้องกับบัญชีนี้อย่างถาวร
                  </p>
                </div>
              </div>
              <DialogFooter className="justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setDeleteDialogUser(null)}
                  disabled={isPending}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="button"
                  className="rounded-xl bg-red-600 text-white hover:bg-red-700"
                  onClick={handleDeleteUser}
                  disabled={isPending}
                >
                  {isPending ? 'กำลังลบ...' : 'ลบผู้ใช้'}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

