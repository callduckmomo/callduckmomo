const fs = require('fs');
let code = fs.readFileSync('src/components/admin/local-products-table.tsx', 'utf8');

// The easiest and safest way to replace these is string replacement or very targeted regex.
// 1. Create product button
code = code.replace(
  `          <div className="flex flex-wrap gap-2">\n            {!isChildSite && (\n              <Button`,
  `          <div className="flex flex-wrap gap-2">\n              <Button`
);
code = code.replace(
  `                สร้างสินค้าใหม่\n              </Button>\n            )}`,
  `                สร้างสินค้าใหม่\n              </Button>`
);

// 2. Profit percent button
code = code.replace(
  `          {!isChildSite && (\n            <Button\n              type="button"\n              id="product-profit-percent-btn"`,
  `            <Button\n              type="button"\n              id="product-profit-percent-btn"`
);
code = code.replace(
  `              ตั้งกำไร (เปอร์เซ็นต์)\n            </Button>\n          )}`,
  `              ตั้งกำไร (เปอร์เซ็นต์)\n            </Button>`
);

// 3. Profit amount & bulk publish
code = code.replace(
  `          {!isChildSite && (\n            <>\n              <Button\n                type="button"\n                id="product-profit-amount-btn"`,
  `            <>\n              <Button\n                type="button"\n                id="product-profit-amount-btn"`
);
code = code.replace(
  `                ไม่เผยแพร่ทั้งหมด\n              </Button>\n            </>\n          )}`,
  `                ไม่เผยแพร่ทั้งหมด\n              </Button>\n            </>`
);

// 4. Headers
code = code.replace(
  `              {!isChildSite && <th className="w-[10%] py-2 pr-2">ต้นทุนจริง</th>}`,
  `              <th className="w-[10%] py-2 pr-2">ต้นทุนจริง</th>`
);
code = code.replace(
  `              {!isChildSite && (\n                <>\n                  <th className="w-[10%] py-2 pr-2">ราคา VIP</th>`,
  `                <>\n                  <th className="w-[10%] py-2 pr-2">ราคา VIP</th>`
);
code = code.replace(
  `                  <th className="w-[10%] py-2 pr-2">ราคาขาจร</th>\n                </>\n              )}`,
  `                  <th className="w-[10%] py-2 pr-2">ราคาขาจร</th>\n                </>`
);

// 5. Skeleton cells
code = code.replace(
  `                  {!isChildSite && (\n                  <td className="py-2 pr-2">\n                    <div className="h-8 w-20 rounded bg-[#F4F4F5] animate-pulse" />\n                  </td>\n                  )}`,
  `                  <td className="py-2 pr-2">\n                    <div className="h-8 w-20 rounded bg-[#F4F4F5] animate-pulse" />\n                  </td>`
);
// Another skeleton cell? Actually, the skeleton only has one {!isChildSite && ...} block:
// Wait, costPrice is one cell, VIP/Walkin is another block?
// Let's check skeleton:
code = code.replace(
  `                  {!isChildSite && (\n                  <>\n                  <td className="py-2 pr-2">\n                    <div className="h-8 w-20 rounded bg-[#F4F4F5] animate-pulse" />\n                  </td>\n                  <td className="py-2 pr-2">\n                    <div className="h-8 w-20 rounded bg-[#F4F4F5] animate-pulse" />\n                  </td>\n                  </>\n                  )}`,
  `                  <>\n                  <td className="py-2 pr-2">\n                    <div className="h-8 w-20 rounded bg-[#F4F4F5] animate-pulse" />\n                  </td>\n                  <td className="py-2 pr-2">\n                    <div className="h-8 w-20 rounded bg-[#F4F4F5] animate-pulse" />\n                  </td>\n                  </>`
);

// 6. Actual cost price cell
code = code.replace(
  `                {!isChildSite && (\n                <td className="align-top py-2 pr-2">\n                  <div className="flex items-center gap-2">\n                    <Input\n                      type="text"`,
  `                <td className="align-top py-2 pr-2">\n                  <div className="flex items-center gap-2">\n                    <Input\n                      type="text"`
);
code = code.replace(
  `                      </Button>\n                    ) : null}\n                  </div>\n                </td>\n                )}`,
  `                      </Button>\n                    ) : null}\n                  </div>\n                </td>`
);

// 7. Actual VIP/Walkin cells
code = code.replace(
  `                {!isChildSite && (\n                  <>\n                <td className="align-top py-2 pr-2">\n                  <div className="flex items-center gap-2">`,
  `                  <>\n                <td className="align-top py-2 pr-2">\n                  <div className="flex items-center gap-2">`
);
code = code.replace(
  `                      </Button>\n                    ) : null}\n                  </div>\n                </td>\n                </>\n                )}`,
  `                      </Button>\n                    ) : null}\n                  </div>\n                </td>\n                </>`
);

// 8. Edit / Manage Stock
code = code.replace(
  `                    {!isChildSite && (\n                    <>\n                    <Button\n                      size="sm"`,
  `                    <>\n                    <Button\n                      size="sm"`
);
code = code.replace(
  `                      จัดการสต๊อก\n                    </Button>\n                    </>\n                    )}`,
  `                      จัดการสต๊อก\n                    </Button>\n                    </>`
);

// 9. Delete
code = code.replace(
  `                    {!isChildSite && (\n                    <Button\n                      size="sm"\n                      variant="outline"\n                      onClick={() => {\n                        setSelectedProduct(product)\n                        setIsDeleteDialogOpen(true)\n                      }}`,
  `                    <Button\n                      size="sm"\n                      variant="outline"\n                      onClick={() => {\n                        setSelectedProduct(product)\n                        setIsDeleteDialogOpen(true)\n                      }}`
);
code = code.replace(
  `                      ลบ\n                    </Button>\n                    )}`,
  `                      ลบ\n                    </Button>`
);

fs.writeFileSync('src/components/admin/local-products-table.tsx', code);
console.log('Replacements done!');
