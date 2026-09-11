# BookStock — Hệ thống quản lý kho sách (Frontend-only)

Ứng dụng web quản lý kho sách: sách, tồn kho (nhập/xuất), đơn hàng, vận chuyển, người dùng và thống kê.
Toàn bộ dữ liệu là **mock phía client** (không có backend), có state phản ứng và business logic thật.

## Công nghệ

- **TanStack Start v1** (React 19 + TanStack Router, file-based routing) trên **Vite 7**
  — dự án dùng TanStack Start thay cho Next.js; routing/SSR do TanStack Router quản lý.
- **Tailwind CSS v4** + **shadcn/ui** (Radix) — design system bằng token semantic trong `src/styles.css`
- **Recharts** cho biểu đồ, **sonner** cho toast, **lucide-react** cho icon
- **Vitest** cho unit test tầng nghiệp vụ

## Chạy dự án

```bash
bun install
bun run dev      # http://localhost:8080
bun run test     # chạy unit test
bun run lint
bun run build
```

## Tài khoản demo

| Vai trò | Email             | Mật khẩu | Quyền                                |
| ------- | ----------------- | -------- | ------------------------------------ |
| ADMIN   | admin@example.com | admin123 | Toàn bộ (kể cả Thống kê, Người dùng) |
| STAFF   | staff@example.com | staff123 | Sách, Kho, Đơn hàng, Vận chuyển      |

Phiên đăng nhập lưu trong `localStorage` (`bookstock.auth`).

## Cấu trúc thư mục

```
src/
  routes/        # file-based routes (dashboard, books, inventory, orders, shipping, users, analytics, login)
  components/
    layout/      # AppShell, SidebarNav, Header, PageContainer, ThemeToggle
    shared/      # StatCard, StatusBadge, SearchInput, FilterBar, Empty/Loading/ErrorState, ConfirmDialog
    data-table/  # DataTable (sort, phân trang, cột cấu hình)
    books/ inventory/ analytics/
  services/      # store (useSyncExternalStore), inventory-service, order-service, auth-service
  hooks/         # use-store, use-auth, use-mobile
  mock/          # dữ liệu tĩnh: books, orders, inventory, shipping, users, analytics
  utils/         # format (tiền tệ, ngày, số), status (label + tone)
  types/         # Book, Order, ImportReceipt, ExportReceipt, Shipping, User
```

## Kiến trúc dữ liệu

UI → hook (`use-store`) → service (`inventory-service`, `order-service`) → `store.setState`.
Không component nào đọc `src/mock` trực tiếp cho dữ liệu động.

Quy tắc nghiệp vụ:

- Nhập kho: tồn kho **+** số lượng, sinh phiếu `IMP-*`, tính tổng giá trị.
- Xuất kho: tồn kho **−** số lượng, chặn khi vượt tồn khả dụng, sinh phiếu `EXP-*`.
- Tạo đơn hàng: kiểm tra tồn kho, giữ hàng (trừ tồn ngay), tổng = tạm tính − giảm giá + phí ship.
- Trạng thái sách tự động: `OUT_OF_STOCK` (0) → `LOW_STOCK` (≤ tồn tối thiểu) → `IN_STOCK`.

## Bảo vệ route

`AppShell` chuyển hướng về `/login` khi chưa đăng nhập, lọc menu theo vai trò và chặn trang
`requiredRole` bằng thông báo "Không có quyền truy cập". Đây là guard **demo phía frontend**,
không thay thế kiểm tra phía server.

## Polish & kiểm thử (Phase 12)

- Skip-link "Bỏ qua điều hướng" + landmark `<main id="main-content">`, aria-label cho các nút icon.
- Ô tìm kiếm trên Header hoạt động: Enter → `/books?q=...` (đồng bộ với bộ lọc trang Sách).
- Trang 404 và error boundary đã Việt hoá, có lối quay về Dashboard.
- Trạng thái rỗng / đang tải / lỗi dùng chung `EmptyState`, `LoadingState`, `ErrorState`.
- Metadata SEO riêng cho từng route (title, description, og:\*).
- 13 unit test cho `inventory-service`, `order-service`, `format` và `bookStatusOf`.

## Giới hạn đã biết

- Dữ liệu chỉ tồn tại trong phiên (reload sẽ về mock gốc); chỉ phiên đăng nhập được lưu.
- Không có API/backend, không phân trang phía server, không upload ảnh thật.
