'use client'

import { useEffect, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react'
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
import Image from 'next/image'

type Category = {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  displayOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function CategoriesTable() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isPending, startTransition] = useTransition()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    displayOrder: 0,
    isActive: true,
  })

  const fetchCategories = () => {
    startTransition(async () => {
      const res = await fetch('/api/admin/categories', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) {
        toast.error('โหลดรายการหมวดหมู่ไม่สำเร็จ')
        return
      }
      const data = (await res.json()) as { categories: Category[] }
      setCategories(data.categories)
    })
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleFileChange = async (file: File) => {
    if (!file) return

    setIsUploadingImage(true)
    try {
      const imageUrl = await uploadAdminImage(file)
      setFormData((prev) => ({ ...prev, imageUrl }))
      toast.success('อัปโหลดรูปภาพสำเร็จ')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'อัปโหลดรูปภาพไม่สำเร็จ')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const isBusy = isPending || isUploadingImage

  const handleCreate = () => {
    setFormData({
      name: '',
      description: '',
      imageUrl: '',
      displayOrder: 0,
      isActive: true,
    })
    setIsCreateDialogOpen(true)
  }

  const handleEdit = (category: Category) => {
    setSelectedCategory(category)
    setFormData({
      name: category.name,
      description: category.description || '',
      imageUrl: category.imageUrl || '',
      displayOrder: category.displayOrder,
      isActive: category.isActive,
    })
    setIsEditDialogOpen(true)
  }

  const handleDelete = (category: Category) => {
    setSelectedCategory(category)
    setIsDeleteDialogOpen(true)
  }

  const handleCreateSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('กรุณากรอกชื่อหมวดหมู่')
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            imageUrl: formData.imageUrl.trim() || null,
            displayOrder: formData.displayOrder,
            isActive: formData.isActive,
          }),
        })

        if (!res.ok) {
          const data = (await res.json()) as { message: string }
          toast.error(data.message || 'สร้างหมวดหมู่ไม่สำเร็จ')
          return
        }

        toast.success('สร้างหมวดหมู่เรียบร้อย')
        setIsCreateDialogOpen(false)
        fetchCategories()
      } catch (error) {
        toast.error('เกิดข้อผิดพลาดในการสร้างหมวดหมู่')
      }
    })
  }

  const handleEditSubmit = async () => {
    if (!selectedCategory || !formData.name.trim()) {
      toast.error('กรุณากรอกชื่อหมวดหมู่')
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/categories', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            id: selectedCategory.id,
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            imageUrl: formData.imageUrl.trim() || null,
            displayOrder: formData.displayOrder,
            isActive: formData.isActive,
          }),
        })

        if (!res.ok) {
          const data = (await res.json()) as { message: string }
          toast.error(data.message || 'อัปเดตหมวดหมู่ไม่สำเร็จ')
          return
        }

        toast.success('อัปเดตหมวดหมู่เรียบร้อย')
        setIsEditDialogOpen(false)
        setSelectedCategory(null)
        fetchCategories()
      } catch (error) {
        toast.error('เกิดข้อผิดพลาดในการอัปเดตหมวดหมู่')
      }
    })
  }

  const handleDeleteConfirm = async () => {
    if (!selectedCategory) return

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/categories?id=${selectedCategory.id}`, {
          method: 'DELETE',
          credentials: 'include',
        })

        if (!res.ok) {
          const data = (await res.json()) as { message: string }
          toast.error(data.message || 'ลบหมวดหมู่ไม่สำเร็จ')
          return
        }

        toast.success('ลบหมวดหมู่เรียบร้อย')
        setIsDeleteDialogOpen(false)
        setSelectedCategory(null)
        fetchCategories()
      } catch (error) {
        toast.error('เกิดข้อผิดพลาดในการลบหมวดหมู่')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#0B0B0B]">หมวดหมู่สินค้า</h3>
        <Button onClick={handleCreate} className="bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)]">
          <Plus className="mr-2 size-4" />
          เพิ่มหมวดหมู่
        </Button>
      </div>

      {isPending && categories.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-[var(--theme-color)]" />
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-8 text-center text-sm text-[#9a5832]">
          ยังไม่มีหมวดหมู่
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-[#E5E7EB]">
                <th className="px-4 py-3 text-left text-sm font-semibold text-[#0B0B0B]">รูปภาพ</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[#0B0B0B]">ชื่อหมวดหมู่</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[#0B0B0B]">คำอธิบาย</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[#0B0B0B]">ลำดับ</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[#0B0B0B]">สถานะ</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-[#0B0B0B]">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-b border-[#E5E7EB]">
                  <td className="px-4 py-3">
                    {category.imageUrl ? (
                      <div className="relative size-12 overflow-hidden rounded-lg bg-[#F4F4F5]">
                        <Image
                          src={category.imageUrl}
                          alt={category.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="size-12 rounded-lg bg-[#F4F4F5]" />
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-[#0B0B0B]">{category.name}</td>
                  <td className="px-4 py-3 text-sm text-[#9a5832]">
                    {category.description || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#0B0B0B]">{category.displayOrder}</td>
                  <td className="px-4 py-3">
                    {category.isActive ? (
                      <Badge className="bg-emerald-500/10 text-emerald-700">ใช้งาน</Badge>
                    ) : (
                      <Badge className="bg-zinc-200 text-zinc-700">ปิดใช้งาน</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[var(--theme-color)]/40 text-[var(--theme-color)] hover:bg-[var(--theme-color)]/10"
                        onClick={() => handleEdit(category)}
                        disabled={isBusy}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(category)}
                        disabled={isBusy}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>เพิ่มหมวดหมู่ใหม่</DialogTitle>
            <DialogDescription>กรอกข้อมูลหมวดหมู่สินค้า</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">ชื่อหมวดหมู่ *</Label>
              <Input
                id="create-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="เช่น Netflix, Disney+"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description">คำอธิบาย</Label>
              <Input
                id="create-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="คำอธิบายหมวดหมู่ (ไม่บังคับ)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-imageUrl">รูปภาพหมวดหมู่</Label>
              <div className="flex flex-col gap-2">
                {formData.imageUrl && (
                  <div className="relative size-20 overflow-hidden rounded-lg border border-[var(--theme-color)]/20 bg-zinc-50">
                    <img
                      src={formData.imageUrl}
                      alt="Category Preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Label
                    htmlFor="create-file-upload"
                    className="flex h-9 cursor-pointer items-center justify-center rounded-lg bg-[var(--theme-color)]/10 px-3 text-center text-xs font-semibold text-[var(--theme-color)] transition hover:bg-[var(--theme-color)]/20 shrink-0"
                  >
                    อัปโหลดรูปภาพ
                  </Label>
                  <input
                    id="create-file-upload"
                    type="file"
                    accept={ADMIN_IMAGE_ACCEPT}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileChange(file)
                    }}
                    className="hidden"
                    disabled={isBusy}
                  />
                  {formData.imageUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setFormData({ ...formData, imageUrl: '' })}
                      className="h-9 px-3 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs rounded-lg"
                      disabled={isBusy}
                    >
                      ลบรูปภาพ
                    </Button>
                  )}
                </div>
                <Input
                  id="create-imageUrl"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="หรือใส่ URL รูปภาพ (เช่น https://example.com/image.png)"
                  className="text-xs"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-displayOrder">ลำดับการแสดงผล</Label>
              <Input
                id="create-displayOrder"
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="create-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="create-isActive">เปิดใช้งาน</Label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isBusy}>
                ยกเลิก
              </Button>
            </DialogClose>
            <Button
              onClick={handleCreateSubmit}
              disabled={isBusy}
              className="bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)]"
            >
              {isBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              สร้าง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>แก้ไขหมวดหมู่</DialogTitle>
            <DialogDescription>แก้ไขข้อมูลหมวดหมู่สินค้า</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">ชื่อหมวดหมู่ *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="เช่น Netflix, Disney+"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">คำอธิบาย</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="คำอธิบายหมวดหมู่ (ไม่บังคับ)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-imageUrl">รูปภาพหมวดหมู่</Label>
              <div className="flex flex-col gap-2">
                {formData.imageUrl && (
                  <div className="relative size-20 overflow-hidden rounded-lg border border-[var(--theme-color)]/20 bg-zinc-50">
                    <img
                      src={formData.imageUrl}
                      alt="Category Preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Label
                    htmlFor="edit-file-upload"
                    className="flex h-9 cursor-pointer items-center justify-center rounded-lg bg-[var(--theme-color)]/10 px-3 text-center text-xs font-semibold text-[var(--theme-color)] transition hover:bg-[var(--theme-color)]/20 shrink-0"
                  >
                    อัปโหลดรูปภาพ
                  </Label>
                  <input
                    id="edit-file-upload"
                    type="file"
                    accept={ADMIN_IMAGE_ACCEPT}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileChange(file)
                    }}
                    className="hidden"
                    disabled={isBusy}
                  />
                  {formData.imageUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setFormData({ ...formData, imageUrl: '' })}
                      className="h-9 px-3 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs rounded-lg"
                      disabled={isBusy}
                    >
                      ลบรูปภาพ
                    </Button>
                  )}
                </div>
                <Input
                  id="edit-imageUrl"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="หรือใส่ URL รูปภาพ (เช่น https://example.com/image.png)"
                  className="text-xs"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-displayOrder">ลำดับการแสดงผล</Label>
              <Input
                id="edit-displayOrder"
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="edit-isActive">เปิดใช้งาน</Label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isBusy}>
                ยกเลิก
              </Button>
            </DialogClose>
            <Button
              onClick={handleEditSubmit}
              disabled={isBusy}
              className="bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)]"
            >
              {isBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>ยืนยันการลบหมวดหมู่</DialogTitle>
            <DialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่ "{selectedCategory?.name}"? 
              การกระทำนี้ไม่สามารถยกเลิกได้ และจะไม่สามารถลบได้หากมีสินค้าใช้หมวดหมู่นี้อยู่
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isBusy}>
                ยกเลิก
              </Button>
            </DialogClose>
            <Button
              onClick={handleDeleteConfirm}
              disabled={isBusy}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              ลบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

