'use client'

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type Setting = {
  key: string
  value: string | null
  description: string | null
}

export default function DiscountSettingsTable() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = () => {
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/discount', { credentials: 'include' })
        if (!res.ok) {
          toast.error('โหลดการตั้งค่าไม่สำเร็จ')
          return
        }
        const data = (await res.json()) as { ok: boolean; setting: Setting | null }
        if (data.ok && data.setting) {
          setSettings([data.setting])
          setDrafts({ [data.setting.key]: data.setting.value ?? '' })
        } else {
          setSettings([])
          setDrafts({})
        }
      } catch (error) {
        toast.error('โหลดการตั้งค่าไม่สำเร็จ')
      }
    })
  }

  const handleDraftChange = (key: string, value: string) => {
    setDrafts((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    setIsSaving(true)
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/discount', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ discount_percentage: drafts['discount_percentage'] || null }),
          credentials: 'include',
        })

        if (!res.ok) {
          const payload = await res.json().catch(() => null)
          toast.error(payload?.message ?? 'บันทึกการตั้งค่าไม่สำเร็จ')
          return
        }

        const payload = (await res.json()) as { ok: boolean; message?: string }
        toast.success(payload.message ?? 'บันทึกการตั้งค่าเรียบร้อย')
        fetchSettings()
      } catch (error) {
        toast.error('บันทึกการตั้งค่าไม่สำเร็จ')
      } finally {
        setIsSaving(false)
      }
    })
  }

  const discountSetting = settings.find((s) => s.key === 'discount_percentage')

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-[#0B0B0B]">จัดการส่วนลด</h3>
          <p className="text-sm text-[#6B7280]">ตั้งค่าเปอร์เซ็นต์ส่วนลดที่แสดงในราคาเดิม</p>
        </div>
        <div className="space-y-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-6">
          {discountSetting ? (
            <div className="space-y-2">
              <Label htmlFor="discount_percentage" className="text-sm text-[#0B0B0B]">
                เปอร์เซ็นต์ส่วนลด (%)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="discount_percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={drafts['discount_percentage'] ?? ''}
                  onChange={(e) => {
                    const value = e.target.value
                    if (
                      value === '' ||
                      (/^\d+(\.\d+)?$/.test(value) && parseFloat(value) >= 0 && parseFloat(value) <= 100)
                    ) {
                      handleDraftChange('discount_percentage', value)
                    }
                  }}
                  placeholder="10"
                  className="rounded-lg border-[var(--theme-color)]/30 bg-white focus-visible:ring-[var(--theme-color)]"
                  disabled={isPending || isSaving}
                />
                <span className="text-sm text-[#6B7280]">%</span>
              </div>
              <p className="text-xs text-[#6B7280]">
                เปอร์เซ็นต์ส่วนลดที่ใช้คำนวณราคาเดิม (เช่น 10 = 10% ของราคาขาย) ตัวอย่าง: ถ้าราคาขาย 100 บาท
                และตั้งไว้ 10% ราคาเดิมจะแสดงเป็น 110 บาท
              </p>
            </div>
          ) : (
            <p className="text-sm text-[#6B7280]">ไม่พบการตั้งค่าส่วนลด</p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isPending || isSaving}
          className="bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)]/90"
        >
          {isSaving || isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              กำลังบันทึก...
            </>
          ) : (
            'บันทึกการตั้งค่า'
          )}
        </Button>
      </div>
    </div>
  )
}

