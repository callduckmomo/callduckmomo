'use client'

import { useState, useEffect, useTransition, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, Search, Edit, Folder } from 'lucide-react'
import { toast } from 'sonner'
import { parseAccountData, formatAccountData, detectSeparator, type Separator, type AccountData } from '@/lib/products/account-parser'

type Product = {
  id: string
  typeId: string
  name: string
  imageUrl: string | null
  price: number | null
  stock: number | null
  accountData: Array<{ email: string; password: string; details?: string }> | null
}

export default function StockManagementTable() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [dataFormat, setDataFormat] = useState<'short' | 'long'>('long')
  const [rawInput, setRawInput] = useState('')
  const [separator, setSeparator] = useState<Separator>(',')

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = products.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.typeId.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredProducts(filtered)
    } else {
      setFilteredProducts(products)
    }
  }, [searchQuery, products])

  // Parse accounts from raw input
  const parsedAccounts = useMemo(() => {
    if (!rawInput.trim() || dataFormat !== 'long') {
      return []
    }
    return parseAccountData(rawInput, separator)
  }, [rawInput, separator, dataFormat])

  async function fetchProducts() {
    try {
      const res = await fetch('/api/admin/products?limit=1000')
      if (!res.ok) {
        toast.error('ไม่สามารถโหลดสินค้าได้')
        return
      }
      const data = (await res.json()) as { products: Product[] }
      setProducts(data.products)
      setFilteredProducts(data.products)
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการโหลดสินค้า')
    }
  }

  function handleEditClick(product: Product) {
    setEditingProduct(product)
    // แปลง accountData เป็น text format - ใช้ details ถ้ามี
    if (product.accountData && Array.isArray(product.accountData) && product.accountData.length > 0) {
      // สร้าง AccountData array จาก product.accountData
      const accountDataArray: AccountData[] = product.accountData.map(acc => {
        const accWithDetails = acc as { details?: string }
        const details = accWithDetails.details || `${acc.email || ''}\n${acc.password || ''}`
        return {
          email: acc.email || '',
          password: acc.password || '',
          details: details,
          rawLines: details.split('\n')
        }
      })
      
      // Format ด้วย comma (,) เสมอตามรูปแบบหลัก
      const formatted = formatAccountData(accountDataArray, ',')
      setRawInput(formatted)
      setSeparator(',')
    } else {
      setRawInput('')
      setSeparator(',')
    }
    setDataFormat('long')
    setIsEditDialogOpen(true)
  }

  function handleCloseDialog() {
    setIsEditDialogOpen(false)
    setEditingProduct(null)
    setRawInput('')
  }

  function handleSave() {
    if (!editingProduct) return

    startTransition(async () => {
      try {
        let accountData: Array<{ email: string; password: string }> | null = null

        if (rawInput.trim()) {
          if (dataFormat === 'long') {
            const parsed = parseAccountData(rawInput, separator)
            accountData = parsed.map(acc => ({
              email: acc.email,
              password: acc.password,
              details: acc.details || acc.rawLines.join('\n'), // เก็บข้อมูลทั้งหมดของบัญชี
            }))
          } else {
            // Short format: user:pass
            const lines = rawInput.split('\n').map(l => l.trim()).filter(l => l)
            accountData = lines.map(line => {
              const [email, password] = line.split(':').map(s => s.trim())
              return { 
                email: email || '', 
                password: password || '',
                details: line, // เก็บข้อมูลทั้งหมด
              }
            }).filter(acc => acc.email || acc.password)
          }
        }

        // คำนวณสต็อกจากจำนวนบัญชี
        const stock = accountData && accountData.length > 0 ? accountData.length : null

        const res = await fetch('/api/admin/products', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            typeId: editingProduct.typeId,
            accountData: accountData && accountData.length > 0 ? accountData : null,
            stock: stock, // อัปเดตสต็อกตามจำนวนบัญชี
          }),
        })

        if (!res.ok) {
          const errorData = (await res.json()) as { message?: string }
          toast.error(errorData.message || 'ไม่สามารถบันทึกข้อมูลได้')
          return
        }

        toast.success('บันทึกข้อมูลเรียบร้อยแล้ว')
        handleCloseDialog()
        fetchProducts()
      } catch (error) {
        toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล')
      }
    })
  }

  function getAccountCount(product: Product): number {
    if (!product.accountData || !Array.isArray(product.accountData)) {
      return 0
    }
    return product.accountData.length
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9a5832]" />
        <Input
          type="text"
          placeholder="ค้นหาสินค้า (ชื่อ หรือ Type ID)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 border-[var(--theme-color)]/40 focus:border-[var(--theme-color)] focus:ring-[var(--theme-color)]/20"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[#E5E7EB] bg-white overflow-hidden">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow className="bg-[#F9FAFB]">
              <TableHead className="w-[200px] text-xs font-semibold text-[#6B7280]">Type ID</TableHead>
              <TableHead className="text-xs font-semibold text-[#6B7280]">ชื่อสินค้า</TableHead>
              <TableHead className="w-[150px] text-xs font-semibold text-[#6B7280]">สต็อก</TableHead>
              <TableHead className="w-[150px] text-xs font-semibold text-[#6B7280]">จำนวนบัญชี</TableHead>
              <TableHead className="w-[150px] text-xs font-semibold text-[#6B7280] text-center">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-[#6B7280]">
                  {searchQuery ? 'ไม่พบสินค้าที่สอดคล้องกับการค้นหา' : 'ยังไม่มีสินค้า'}
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id} className="hover:bg-[#F9FAFB]">
                  <TableCell className="font-mono text-xs text-[#0B0B0B]">
                    {product.typeId}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="size-10 rounded object-cover"
                        />
                      ) : null}
                      <span className="text-sm font-medium text-[#0B0B0B]">{product.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-[#0B0B0B]">
                    {product.stock ?? 0} ชิ้น
                  </TableCell>
                  <TableCell className="text-sm text-[#0B0B0B]">
                    {getAccountCount(product)} บัญชี
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditClick(product)}
                      className="h-8 text-xs border-[var(--theme-color)]/40 text-[var(--theme-color)] hover:bg-[var(--theme-color)] hover:text-white hover:border-[var(--theme-color)]"
                    >
                      <Edit className="mr-1 size-3" />
                      แก้ไข
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      {filteredProducts.length > 0 && (
        <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-sm text-[#6B7280]">
          แสดงสินค้า {filteredProducts.length} รายการ
          {searchQuery && products.length !== filteredProducts.length && (
            <span> จากทั้งหมด {products.length} รายการ</span>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[92vw] max-w-[92vw] sm:w-full sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#0B0B0B] break-words">
              จัดการข้อมูลบัญชี - {editingProduct?.name}
            </DialogTitle>
            <DialogDescription className="text-sm text-[#9a5832] break-words">
              กรอกข้อมูลบัญชีในรูปแบบที่กำหนด แล้วระบบจะแยกข้อมูลให้อัตโนมัติ
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 w-full min-w-0">
            {/* Data Format Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#0B0B0B]">รูปแบบข้อมูลไอดี *</Label>
              <RadioGroup value={dataFormat} onValueChange={(value) => setDataFormat(value as 'short' | 'long')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="short" id="format-short" />
                  <Label htmlFor="format-short" className="text-sm text-[#6B7280] cursor-pointer">
                    รูปแบบสั้น (user:pass)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="long" id="format-long" />
                  <Label htmlFor="format-long" className="text-sm text-[#6B7280] cursor-pointer">
                    รูปแบบยาว (ข้อมูลละเอียด)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Separator Selection (only for long format) */}
            {dataFormat === 'long' && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#0B0B0B]">
                  เครื่องหมายในการแยกสินค้า / Separator
                </Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)]"
                  >
                    Comma (,)
                  </Button>
                </div>
              </div>
            )}

            {/* Input Text Area */}
            <div className="space-y-2 w-full min-w-0">
              <Label htmlFor="account-input" className="text-sm font-semibold text-[#0B0B0B]">
                {dataFormat === 'long' ? 'ข้อมูลไอดีแบบละเอียด *' : 'ข้อมูลไอดีแบบสั้น *'}
              </Label>
              <Textarea
                id="account-input"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder={
                  dataFormat === 'long'
                    ? `Email : acc1@gmail.com\nPass: 123\nX ห้ามเปลี่ยนรหัส X\n,\nEmail : acc2@gmail.com\nPass: 456\nX ห้ามเปลี่ยนรหัส X`
                    : 'user1:pass1\nuser2:pass2'
                }
                className="min-h-[200px] font-mono text-sm border-[var(--theme-color)]/40 focus:border-[var(--theme-color)] focus:ring-[var(--theme-color)]/20 w-full max-w-full min-w-0"
              />
            </div>

            {/* Preview - แสดงทันทีเมื่อมีข้อมูลและเลือก separator แล้ว */}
            {rawInput.trim() && (
              <div className="rounded-lg border border-[var(--theme-color)]/40 bg-[#fff4ed] p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--theme-color)]">
                  <Folder className="size-4" />
                  <span>สิ่งที่จะได้ในการแยกสินค้า / Value</span>
                </div>
                
                {dataFormat === 'long' && parsedAccounts.length > 0 ? (
                  <>
                    <div className="text-sm text-[#6B7280]">
                      จำนวนไอดีที่จะสร้าง: <span className="font-semibold text-[#0B0B0B]">{parsedAccounts.length} ไอดี</span>
                    </div>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {parsedAccounts.map((account, index) => (
                        <div
                          key={index}
                          className="rounded-lg border border-[var(--theme-color)]/20 bg-white p-4 text-xs"
                        >
                          <div className="font-semibold text-[#0B0B0B] mb-2">ไอดี #{index + 1}</div>
                          <div className="space-y-1 text-[#6B7280] whitespace-pre-wrap break-words">
                            {account.details || account.rawLines.join('\n')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : dataFormat === 'short' && rawInput.trim() ? (
                  <div className="text-sm text-[#6B7280]">
                    จำนวนไอดีที่จะสร้าง: <span className="font-semibold text-[#0B0B0B]">{rawInput.split('\n').filter(l => l.trim()).length} ไอดี</span>
                  </div>
                ) : dataFormat === 'long' && rawInput.trim() && parsedAccounts.length === 0 ? (
                  <div className="text-sm text-[#9CA3AF] italic">
                    ไม่สามารถแยกข้อมูลได้ กรุณาตรวจสอบรูปแบบข้อมูลและเครื่องหมายแบ่ง
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseDialog}
              disabled={isPending}
              className="border-[var(--theme-color)]/40 text-[var(--theme-color)] hover:bg-[var(--theme-color)]/10"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleSave}
              disabled={isPending}
              className="bg-[var(--theme-color)] text-white hover:bg-[var(--theme-color)]"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                'บันทึก'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
