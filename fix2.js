const fs = require('fs');
let code = fs.readFileSync('src/components/admin/local-products-table.tsx', 'utf8');

// 1. Create product
code = code.replace(/{!isChildSite && \(\s*(<Button[\s\S]*?สร้างสินค้าใหม่\s*<\/Button>)\s*\)}/g, '$1');

// 2. Profit percent
code = code.replace(/{!isChildSite && \(\s*(<Button[^>]*id="product-profit-percent-btn"[\s\S]*?ตั้งกำไร \(เปอร์เซ็นต์\)\s*<\/Button>)\s*\)}/g, '$1');

// 3. Profit amount & bulk publish
code = code.replace(/{!isChildSite && \(\s*<>\s*(<Button[^>]*id="product-profit-amount-btn"[\s\S]*?ไม่เผยแพร่ทั้งหมด\s*<\/Button>)\s*<\/>\s*\)}/g, '<>\n$1\n</>');

// 4. Headers
code = code.replace(/{!isChildSite && (<th className="w-\[10%\] py-2 pr-2">ต้นทุนจริง<\/th>)}/g, '$1');
code = code.replace(/{!isChildSite && \(\s*<>\s*(<th className="w-\[10%\] py-2 pr-2">ราคา VIP<\/th>\s*<th className="w-\[10%\] py-2 pr-2">ราคาขาจร<\/th>)\s*<\/>\s*\)}/g, '<>\n$1\n</>');

// 5. Skeleton cells
code = code.replace(/{!isChildSite && \(\s*(<td className="py-2 pr-2">\s*<div className="h-8 w-20 rounded bg-\[#F4F4F5\] animate-pulse" \/>\s*<\/td>)\s*\)}/g, '$1');

// 6. Actual cost price cell
code = code.replace(/{!isChildSite && \(\s*(<td className="align-top py-2 pr-2">[\s\S]*?costPriceDrafts[\s\S]*?<\/td>)\s*\)}/g, '$1');

// 7. Actual VIP/Walkin cells
code = code.replace(/{!isChildSite && \(\s*<>\s*(<td className="align-top py-2 pr-2">[\s\S]*?priceVipDrafts[\s\S]*?<\/td>\s*<td className="align-top py-2 pr-2">[\s\S]*?priceWalkinDrafts[\s\S]*?<\/td>)\s*<\/>\s*\)}/g, '<>\n$1\n</>');

// 8. Edit / Manage Stock
code = code.replace(/{!isChildSite && \(\s*<>\s*(<Button[\s\S]*?แก้ไข\s*<\/Button>\s*<Button[\s\S]*?จัดการสต๊อก\s*<\/Button>)\s*<\/>\s*\)}/g, '<>\n$1\n</>');

// 9. Delete
code = code.replace(/{!isChildSite && \(\s*(<Button[\s\S]*?ลบ\s*<\/Button>)\s*\)}/g, '$1');

fs.writeFileSync('src/components/admin/local-products-table.tsx', code);
console.log('Fixed restrictions!');
