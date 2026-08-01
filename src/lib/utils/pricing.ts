/**
 * คำนวณราคาเดิมจากราคาขายและเปอร์เซ็นต์ส่วนลด
 * @param salePrice ราคาขาย (บาท)
 * @param discountPercentage เปอร์เซ็นต์ส่วนลด (เช่น 10 = 10%)
 * @returns ราคาเดิม (บาท)
 */
export function calculateOriginalPrice(
  salePrice: number | null,
  discountPercentage: number | null
): number | null {
  if (salePrice === null || salePrice <= 0) {
    return null;
  }

  if (discountPercentage === null || discountPercentage <= 0) {
    return salePrice;
  }

  // ราคาเดิม = ราคาขาย + (ราคาขาย * discount_percentage / 100)
  const originalPrice = salePrice + (salePrice * discountPercentage / 100);
  return Math.round(originalPrice * 100) / 100; // ปัดเศษเป็น 2 ทศนิยม
}

/**
 * คำนวณราคาตาม user tier
 * @param price ราคาสำหรับ normal user
 * @param priceVip ราคาสำหรับ vip user
 * @param priceWalkin ราคาสำหรับ walkin user
 * @param tier tier ของ user ('normal' | 'vip' | 'walkin')
 * @returns ราคาที่ต้องใช้ตาม tier
 */
export function getPriceByTier(
  price: number | null,
  priceVip: number | null,
  priceWalkin: number | null = null,
  tier: 'normal' | 'vip' | 'walkin' = 'normal'
): number | null {
  if (tier === 'vip') {
    // ถ้าเป็น VIP และมี priceVip ให้ใช้ priceVip
    // ถ้าไม่มี ให้ใช้ price แทน
    return priceVip != null ? priceVip : price;
  }
  if (tier === 'walkin') {
    // ถ้าเป็น walkin และมี priceWalkin ให้ใช้ priceWalkin
    // ถ้าไม่มี ให้ใช้ price แทน
    return priceWalkin != null ? priceWalkin : price;
  }
  // ถ้าเป็น normal ให้ใช้ price
  return price;
}

