const fs = require('fs');

const filePath = 'fe/src/routes/pos.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Normalize phone in submitOrder function
content = content.replace(
  'customerPhone: customerPhone.trim() || "0900000000",',
  'customerPhone: customerPhone.replace(/\\D/g, "").replace(/^84/, "0"),'
);

// 2. Update disabled condition to require phone
content = content.replace(
  /disabled=\{\s*isSubmitting\s*\|\|\s*cart\.length === 0\s*\|\|\s*!customerName\.trim\(\)\s*\|\|\s*isCashInsufficient\s*\}/g,
  `disabled={
    isSubmitting ||
    cart.length === 0 ||
    !customerName.trim() ||
    !customerPhone.trim() ||
    isCashInsufficient
  }`
);

// 3. Update validators in submitOrder
const oldValidators = `    if (!customerName.trim()) {
      toast.error("Vui lòng nhập tên khách hàng");
      return;
    }
    if (total <= 0) {`;

const newValidators = `    if (!customerName.trim()) {
      toast.error("Vui lòng nhập tên khách hàng");
      return;
    }
    if (!customerPhone.trim()) {
      toast.error("Vui lòng nhập số điện thoại khách hàng");
      return;
    }
    if (customerPhone.replace(/\\D/g, "").length < 8) {
      toast.error("Số điện thoại không hợp lệ (tối thiểu 8 ký tự)");
      return;
    }
    if (total <= 0) {`;

content = content.replace(oldValidators, newValidators);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('✓ Updated pos.tsx - require phone, normalize phone, add validators');
