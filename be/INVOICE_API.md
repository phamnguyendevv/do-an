# Invoice API Documentation

## Tổng quan

Module Invoice đã được tạo để quản lý hóa đơn với đầy đủ thông tin từ các module khác trong hệ thống scheduling. API này cho phép tạo, đọc, cập nhật và xóa hóa đơn với các mối quan hệ đầy đủ.

## Các thành phần chính

### 1. Invoice Entity

- **Thông tin cơ bản**: ID, số hóa đơn (tự động generate), ngày phát hành, ngày đến hạn
- **Thông tin tài chính**: subtotal, discount, tax, total amount, currency
- **Trạng thái**: Draft, Sent, Paid, Overdue, Cancelled, Refunded
- **Metadata**: notes, payment terms

### 2. Mối quan hệ (Relations)

- **Appointment**: Thông tin cuộc hẹn (service, provider, client, thời gian)
- **Order**: Thông tin đơn hàng
- **Provider**: Thông tin nhà cung cấp dịch vụ
- **Client**: Thông tin khách hàng
- **Service**: Thông tin dịch vụ và category
- **Promotion**: Thông tin khuyến mãi (nếu có)
- **Payments**: Danh sách các thanh toán liên quan

## API Endpoints

### Admin Endpoints

#### 1. Tạo hóa đơn mới

```
POST /admin/invoices
```

**Body:**

```json
{
  "appointmentId": 1,
  "orderId": 1,
  "providerId": 1,
  "clientId": 1,
  "subtotal": 100.0,
  "discountAmount": 10.0,
  "taxAmount": 8.0,
  "totalAmount": 98.0,
  "currency": "usd",
  "status": 1,
  "notes": "Thank you for your business",
  "paymentTerms": "Net 30"
}
```

#### 2. Lấy chi tiết hóa đơn

```
GET /admin/invoices/:id
```

#### 3. Lấy danh sách hóa đơn

```
GET /admin/invoices?page=1&size=10&status=3&search=INV-2024
```

**Query Parameters:**

- `page`: Số trang (default: 1)
- `size`: Số lượng items per page (default: 10)
- `search`: Tìm kiếm theo số hóa đơn, notes, email
- `invoiceNumber`: Filter theo số hóa đơn
- `appointmentId`: Filter theo appointment ID
- `orderId`: Filter theo order ID
- `providerId`: Filter theo provider ID
- `clientId`: Filter theo client ID
- `status`: Filter theo trạng thái (1-6)
- `currency`: Filter theo loại tiền tệ
- `minAmount`, `maxAmount`: Filter theo khoảng giá
- `startDate`, `endDate`: Filter theo khoảng thời gian
- `issueDate`, `dueDate`: Filter theo ngày cụ thể

#### 4. Cập nhật hóa đơn

```
PUT /admin/invoices/:id
```

#### 5. Xóa hóa đơn (soft delete)

```
DELETE /admin/invoices/:id
```

### Provider Endpoints

#### 1. Lấy danh sách hóa đơn của provider

```
GET /provider/invoices
```

#### 2. Lấy chi tiết hóa đơn của provider

```
GET /provider/invoices/:id
```

### Client Endpoints

#### 1. Lấy danh sách hóa đơn của client

```
GET /client/invoices
```

#### 2. Lấy chi tiết hóa đơn của client

```
GET /client/invoices/:id
```

## Invoice Status

1. **Draft (1)**: Hóa đơn nháp
2. **Sent (2)**: Đã gửi cho khách hàng
3. **Paid (3)**: Đã thanh toán
4. **Overdue (4)**: Quá hạn thanh toán
5. **Cancelled (5)**: Đã hủy
6. **Refunded (6)**: Đã hoàn tiền

## Response Format

### Invoice Detail Response

```json
{
  "id": 1,
  "invoiceNumber": "INV-202401-0001",
  "appointmentId": 1,
  "orderId": 1,
  "providerId": 1,
  "clientId": 1,
  "issueDate": "2024-01-15T00:00:00.000Z",
  "dueDate": "2024-02-15T00:00:00.000Z",
  "subtotal": 100.0,
  "discountAmount": 10.0,
  "taxAmount": 8.0,
  "totalAmount": 98.0,
  "currency": "usd",
  "status": 3,
  "notes": "Thank you for your business",
  "paymentTerms": "Net 30",
  "createdAt": "2024-01-15T00:00:00.000Z",
  "updatedAt": "2024-01-15T00:00:00.000Z",
  "appointment": {
    "id": 1,
    "startTime": "2024-01-20T10:00:00.000Z",
    "endTime": "2024-01-20T11:00:00.000Z",
    "duration": 60,
    "status": 3,
    "notes": "Regular appointment",
    "service": {
      "id": 1,
      "name": "Hair Cut",
      "description": "Professional hair cutting service",
      "price": 100.0,
      "duration": 60,
      "category": {
        "id": 1,
        "name": "Hair Services",
        "description": "Hair related services"
      }
    },
    "provider": {
      "id": 1,
      "email": "provider@example.com",
      "username": "provider1",
      "phone": "+1234567890",
      "providerProfile": {
        "businessName": "Hair Salon",
        "experience": 5
      }
    }
  },
  "order": {
    "id": 1,
    "totalAmount": 100.0,
    "currency": "usd",
    "status": 2,
    "note": "Order completed"
  },
  "provider": {
    "id": 1,
    "email": "provider@example.com",
    "username": "provider1",
    "phone": "+1234567890"
  },
  "client": {
    "id": 2,
    "email": "client@example.com",
    "username": "client1",
    "phone": "+0987654321"
  },
  "payments": [
    {
      "id": 1,
      "amount": 98.0,
      "currency": "usd",
      "status": 2,
      "method": 1,
      "paymentDate": "2024-01-20T10:30:00.000Z"
    }
  ]
}
```

### Invoice List Response

```json
{
  "data": [
    // Array of invoice objects (same format as detail)
  ],
  "pagination": {
    "page": 1,
    "size": 10,
    "totalCount": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Tính năng đặc biệt

### 1. Auto-generate Invoice Number

- Format: `INV-YYYYMM-XXXX` (VD: INV-202401-0001)
- Tự động tăng sequence theo tháng

### 2. Comprehensive Relations

- Khi lấy thông tin hóa đơn, tự động load tất cả thông tin liên quan:
  - Thông tin cuộc hẹn với service và category
  - Thông tin provider với profile
  - Thông tin client
  - Thông tin order
  - Thông tin promotion (nếu có)
  - Danh sách payments

### 3. Flexible Search & Filter

- Tìm kiếm text trong số hóa đơn, notes, email
- Filter theo multiple criteria
- Pagination hỗ trợ

### 4. Permission-based Access

- Admin: Full access to all invoices
- Provider: Access to own invoices only
- Client: Access to own invoices only

## Database Schema

### Table: invoices

```sql
CREATE TABLE invoices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  invoiceNumber VARCHAR UNIQUE,
  appointmentId INT,
  orderId INT,
  providerId INT,
  clientId INT,
  issueDate TIMESTAMP,
  dueDate TIMESTAMP,
  subtotal DECIMAL(10,2),
  discountAmount DECIMAL(10,2) DEFAULT 0,
  taxAmount DECIMAL(10,2) DEFAULT 0,
  totalAmount DECIMAL(10,2),
  currency VARCHAR DEFAULT 'usd',
  status ENUM('1','2','3','4','5','6') DEFAULT '1',
  notes TEXT,
  paymentTerms VARCHAR,
  isDeleted BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (appointmentId) REFERENCES appointments(id),
  FOREIGN KEY (orderId) REFERENCES orders(id),
  FOREIGN KEY (providerId) REFERENCES users(id),
  FOREIGN KEY (clientId) REFERENCES users(id)
);
```

## Cách sử dụng

1. **Tạo hóa đơn**: Sau khi appointment hoàn thành và có order, tạo invoice
2. **Gửi hóa đơn**: Cập nhật status từ Draft sang Sent
3. **Thanh toán**: Sau khi payment thành công, cập nhật status sang Paid
4. **Quản lý**: Sử dụng các endpoint để quản lý và theo dõi hóa đơn

API này cung cấp đầy đủ thông tin về hóa đơn bao gồm appointment, provider, promotion, service, payment, order, và category như yêu cầu.
