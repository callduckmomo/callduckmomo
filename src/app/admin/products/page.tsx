import { fetchProductsFromMaster } from "@/lib/api-master/products";
import { getLocalProductPrices, saveProductSellingPrice } from "./actions";
import { getSiteId } from "@/lib/site";
import type { Metadata } from "next";

import { loadLayoutPublicSettings } from "@/lib/settings/load-layout-public-settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const publicSettings = await loadLayoutPublicSettings();
  const siteTitle = publicSettings.site_title || "Shop";
  const shortTitle = siteTitle.split('|')[0].trim();

  return {
    title: `${shortTitle} Admin Panel`,
    robots: { index: false, follow: false },
  };
}

export default async function AdminProductsPage() {
  const masterProducts = await fetchProductsFromMaster();
  const localPrices = await getLocalProductPrices();

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">จัดการราคาสินค้า</h1>
        <p className="text-gray-500 mt-2">
          ตั้งราคาขายหน้าร้าน (Selling Price) สำหรับสินค้าที่ดึงมาจากระบบแม่
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สินค้า</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ราคาทุน (Master)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ราคาขาย (Local)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">กำไร (Profit)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {masterProducts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  ไม่พบสินค้าจากระบบแม่ หรือยังไม่ได้ตั้งค่า API Key
                </td>
              </tr>
            ) : (
              masterProducts.map((product) => {
                const localData = localPrices[product.id];
                const localPrice = localData ? localData.price : null;
                const profit = localPrice != null ? localPrice - (product.cost_price || 0) : null;
                
                return (
                <tr key={product.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {product.image_url && (
                        <div className="flex-shrink-0 h-10 w-10 mr-4">
                          <img className="h-10 w-10 rounded-full object-cover" src={product.image_url} alt="" />
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ฿{product.cost_price?.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">
                    {localPrice ? `฿${localPrice.toLocaleString()}` : "ยังไม่ได้ตั้งราคา"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {profit !== null ? (
                      <span className={profit > 0 ? "text-green-600" : profit < 0 ? "text-red-600" : "text-gray-500"}>
                        {profit > 0 ? "+" : ""}฿{profit.toLocaleString()}
                      </span>
                    ) : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <form action={async (formData: FormData) => {
                      "use server";
                      const price = formData.get("selling_price");
                      if (price) {
                        await saveProductSellingPrice(product.id, parseFloat(price as string));
                      }
                    }} className="flex gap-2 items-center">
                      <input
                        type="number"
                        name="selling_price"
                        step="0.01"
                        placeholder="ราคาขาย"
                        defaultValue={localPrice || ""}
                        required
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
                      >
                        บันทึก
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
