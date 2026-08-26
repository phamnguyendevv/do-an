# Automatic Invoice Creation Flow

## Tổng quan

Khi client thanh toán xong, hệ thống sẽ tự động tạo invoice mà không cần admin phải tạo thủ công.

## Luồng hoạt động

### 1. Client thanh toán

- Client thực hiện thanh toán qua Stripe
- Stripe gửi webhook event về server

### 2. Webhook processing

**File:** `src/use-cases/payment/handle-webhook.use-case.ts`

Các event được xử lý:

- `payment_intent.succeeded` → Tạo invoice tự động
- `checkout.session.completed` → Tạo invoice tự động
- `payment_intent.payment_failed` → Không tạo invoice
- `charge.dispute.created` → Không tạo invoice
- `invoice.payment_failed` → Không tạo invoice
- `customer.subscription.deleted` → Không tạo invoice

### 3. Tự động tạo invoice

**File:** `src/use-cases/invoices/create-invoice-from-order.use-case.ts`

Quá trình tạo invoice:

```typescript
async execute(orderId: string): Promise<InvoiceEntity> {
  // 1. Tìm order với đầy đủ thông tin
  const order = await this.orderRepository.findOrderById(orderId)

  // 2. Kiểm tra order hợp lệ
  if (!order || !order.appointment) {
    throw new Error('Order or appointment not found')
  }

  // 3. Kiểm tra invoice đã tồn tại chưa
  const existingInvoice = await this.invoiceRepository.findInvoiceByOrderId(orderId)
  if (existingInvoice) {
    return existingInvoice
  }

  // 4. Tạo invoice mới
  const invoiceData = new InvoiceEntity()
  invoiceData.invoiceNumber = await this.invoiceRepository.generateInvoiceNumber()
  invoiceData.orderId = order.id
  invoiceData.appointmentId = order.appointment.id
  // ... set các field khác

  // 5. Lưu vào database
  return await this.invoiceRepository.createInvoice(invoiceData)
}
```

### 4. Cấu trúc Invoice được tạo

Invoice sẽ chứa đầy đủ thông tin:

- **Order information**: Liên kết với order đã thanh toán
- **Appointment details**: Thông tin cuộc hẹn
- **Provider info**: Thông tin người cung cấp dịch vụ
- **Client info**: Thông tin khách hàng
- **Service details**: Chi tiết dịch vụ
- **Category**: Danh mục dịch vụ
- **Promotion**: Thông tin khuyến mãi (nếu có)
- **Payment**: Liên kết với payment đã hoàn thành
- **Invoice number**: Số hóa đơn tự động (INV-YYYYMM-XXXX)
- **Status**: Tự động set là "Paid" vì payment đã hoàn thành

### 5. Logging và Error Handling

Hệ thống sẽ log:

- ✅ Invoice created successfully
- ❌ Failed to create invoice (nhưng không ảnh hưởng đến payment flow)

## Lợi ích

1. **Tự động hóa**: Không cần admin tạo invoice thủ công
2. **Đồng bộ**: Invoice được tạo ngay khi payment thành công
3. **Đầy đủ thông tin**: Invoice chứa tất cả thông tin cần thiết
4. **Reliable**: Có duplicate checking, error handling
5. **Audit trail**: Có logging để tracking

## API Endpoints vẫn có sẵn

Admin vẫn có thể:

- Xem danh sách invoices: `GET /admin/invoices`
- Xem chi tiết invoice: `GET /admin/invoices/:id`
- Cập nhật invoice: `PUT /admin/invoices/:id`
- Tạo invoice thủ công (nếu cần): `POST /admin/invoices`

Provider có thể:

- Xem invoices của mình: `GET /provider/invoices`
- Xem chi tiết: `GET /provider/invoices/:id`

Client có thể:

- Xem invoices của mình: `GET /client/invoices`
- Xem chi tiết: `GET /client/invoices/:id`
