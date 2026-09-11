import * as XLSX from "xlsx";
import type { Book, Order, StockMovement } from "@/types";

export interface ParsedBookRow {
  title: string;
  author: string;
  publisher?: string;
  isbn?: string;
  category: string;
  importPrice: number;
  price: number;
  stock: number;
  minStock: number;
  description?: string;
  publishedYear?: number;
  coverImage?: string;
}

export interface ParsedImportRow {
  bookIdOrTitle: string;
  quantity: number;
  price: number;
}

/**
 * Tạo và tải xuống file Excel mẫu để nhập sách hàng loạt
 */
export function downloadBookImportTemplate() {
  const headers = [
    "Tên sách (*)",
    "Tác giả (*)",
    "Nhà xuất bản",
    "Mã ISBN",
    "Danh mục (*)",
    "Giá nhập (VNĐ)",
    "Giá bán (VNĐ) (*)",
    "Tồn kho ban đầu",
    "Tồn tối thiểu",
    "Năm xuất bản",
    "Mô tả",
  ];

  const sampleRows = [
    [
      "Đắc Nhân Tâm (Bìa Cứng)",
      "Dale Carnegie",
      "NXB Tổng Hợp TPHCM",
      "978-604-58-1234-5",
      "Kỹ năng sống",
      65000,
      95000,
      50,
      10,
      2024,
      "Cuốn sách hay nhất mọi thời đại về nghệ thuật đối nhân xử thế",
    ],
    [
      "Nhà Giả Kim",
      "Paulo Coelho",
      "NXB Hội Nhà Văn",
      "978-604-98-5678-9",
      "Tiểu thuyết",
      50000,
      79000,
      100,
      15,
      2023,
      "Hành trình đi tìm kho báu và lẽ sống của chàng chăn cừu Santiago",
    ],
    [
      "Tư Duy Nhanh Và Chậm",
      "Daniel Kahneman",
      "NXB Thế Giới",
      "978-604-77-9012-3",
      "Kinh tế",
      120000,
      189000,
      30,
      5,
      2022,
      "Cuốn sách kinh điển về kinh tế học hành vi và tâm lý con người",
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);

  // Set column widths
  ws["!cols"] = [
    { wch: 30 }, // Tên sách
    { wch: 20 }, // Tác giả
    { wch: 25 }, // NXB
    { wch: 20 }, // ISBN
    { wch: 18 }, // Danh mục
    { wch: 15 }, // Giá nhập
    { wch: 15 }, // Giá bán
    { wch: 16 }, // Tồn ban đầu
    { wch: 14 }, // Tồn tối thiểu
    { wch: 14 }, // Năm XB
    { wch: 45 }, // Mô tả
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Mau_Nhap_Sach");
  XLSX.writeFile(wb, "mau_nhap_sach_bookstock.xlsx");
}

/**
 * Tạo và tải xuống file Excel mẫu để tạo phiếu nhập kho
 */
export function downloadInventoryImportTemplate() {
  const headers = ["Mã sách hoặc Tên sách (*)", "Số lượng nhập (*)", "Đơn giá nhập (VNĐ) (*)"];
  const sampleRows = [
    ["Đắc Nhân Tâm (Bìa Cứng)", 20, 65000],
    ["Nhà Giả Kim", 50, 50000],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  ws["!cols"] = [{ wch: 35 }, { wch: 18 }, { wch: 22 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Mau_Nhap_Kho");
  XLSX.writeFile(wb, "mau_nhap_kho_bookstock.xlsx");
}

/**
 * Đọc file Excel người dùng tải lên và parse thành danh sách Sách
 */
export async function parseBookExcelFile(file: File): Promise<{
  data: ParsedBookRow[];
  errors: string[];
}> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) {
    return { data: [], errors: ["File Excel không có sheet dữ liệu nào."] };
  }

  const ws = wb.Sheets[firstSheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];

  if (rows.length < 2) {
    return { data: [], errors: ["File Excel trống hoặc chỉ có dòng tiêu đề."] };
  }

  const data: ParsedBookRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[] | undefined;
    if (!row || row.length === 0 || !row[0]) continue; // Bỏ qua dòng trống

    const title = String(row[0] || "").trim();
    const author = String(row[1] || "").trim();
    const publisher = row[2] ? String(row[2]).trim() : undefined;
    const isbn = row[3] ? String(row[3]).trim() : undefined;
    const category = String(row[4] || "Tổng hợp").trim();
    const importPrice = Math.max(0, Number(row[5]) || 0);
    const price = Math.max(0, Number(row[6]) || 0);
    const stock = Math.max(0, Number(row[7]) || 0);
    const minStock = Math.max(0, Number(row[8]) || 10);
    const publishedYear = row[9] ? Number(row[9]) : undefined;
    const description = row[10] ? String(row[10]).trim() : undefined;

    if (!title) {
      errors.push(`Dòng ${i + 1}: Thiếu Tên sách.`);
      continue;
    }
    if (!author) {
      errors.push(`Dòng ${i + 1}: Thiếu Tác giả cho sách "${title}".`);
      continue;
    }
    if (price <= 0) {
      errors.push(`Dòng ${i + 1}: Giá bán của sách "${title}" phải lớn hơn 0.`);
      continue;
    }

    data.push({
      title,
      author,
      publisher,
      isbn,
      category,
      importPrice,
      price,
      stock,
      minStock,
      publishedYear,
      description,
    });
  }

  return { data, errors };
}

/**
 * Đọc file Excel phiếu nhập kho
 */
export async function parseInventoryImportFile(file: File): Promise<{
  data: ParsedImportRow[];
  errors: string[];
}> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) {
    return { data: [], errors: ["File Excel không có sheet dữ liệu nào."] };
  }

  const ws = wb.Sheets[firstSheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];

  const data: ParsedImportRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[] | undefined;
    if (!row || row.length === 0 || !row[0]) continue;

    const bookIdOrTitle = String(row[0]).trim();
    const quantity = parseInt(String(row[1]), 10) || 0;
    const price = Number(row[2]) || 0;

    if (!bookIdOrTitle) {
      errors.push(`Dòng ${i + 1}: Thiếu tên hoặc mã sách.`);
      continue;
    }
    if (quantity <= 0) {
      errors.push(`Dòng ${i + 1}: Số lượng nhập phải lớn hơn 0.`);
      continue;
    }

    data.push({
      bookIdOrTitle,
      quantity,
      price: Math.max(0, price),
    });
  }

  return { data, errors };
}

/**
 * Xuất toàn bộ danh sách Sách ra file Excel
 */
export function exportBooksToExcel(books: Book[], filename = "danh_sach_sach_bookstock") {
  const headers = [
    "Mã sách",
    "Tên sách",
    "Tác giả",
    "Nhà xuất bản",
    "Mã ISBN",
    "Danh mục",
    "Giá nhập (VNĐ)",
    "Giá bán (VNĐ)",
    "Tồn kho",
    "Tồn tối thiểu",
    "Trạng thái",
  ];

  const rows = books.map((b) => [
    b.id,
    b.title,
    b.author,
    b.publisher || "",
    b.isbn || "",
    b.category,
    b.purchasePrice ?? b.importPrice ?? 0,
    b.sellingPrice ?? b.price ?? 0,
    b.stock,
    b.minStock,
    b.status === "IN_STOCK" ? "Còn hàng" : b.status === "LOW_STOCK" ? "Sắp hết hàng" : "Hết hàng",
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = [
    { wch: 10 },
    { wch: 32 },
    { wch: 22 },
    { wch: 22 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "DanhSachSach");
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Xuất Danh sách Đơn hàng ra file Excel
 */
export function exportOrdersToExcel(orders: Order[], filename = "danh_sach_don_hang") {
  const headers = [
    "Mã đơn hàng",
    "Khách hàng",
    "Số điện thoại",
    "Địa chỉ giao hàng",
    "Tổng số SP",
    "Tạm tính (VNĐ)",
    "Giảm giá (VNĐ)",
    "Phí ship (VNĐ)",
    "Tổng tiền (VNĐ)",
    "Thanh toán",
    "Đơn vị vận chuyển",
    "Mã vận đơn",
    "Trạng thái",
    "Ngày tạo",
  ];

  const rows = orders.map((o) => [
    o.orderCode || o.id,
    o.customerName,
    o.customerPhone,
    o.customerAddress,
    (o.items || []).reduce((s, i) => s + (i.quantity || 0), 0),
    o.subtotal || 0,
    o.discount || 0,
    o.shippingFee || 0,
    o.total,
    o.payment === "PAID"
      ? "Đã thanh toán"
      : o.payment === "REFUNDED"
        ? "Đã hoàn tiền"
        : "Chưa thanh toán",
    o.shippingMethod,
    o.trackingCode || "",
    o.status,
    new Date(o.createdAt).toLocaleString("vi-VN"),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = [
    { wch: 16 },
    { wch: 22 },
    { wch: 16 },
    { wch: 35 },
    { wch: 12 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
    { wch: 18 },
    { wch: 16 },
    { wch: 22 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "DonHang");
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Xuất Sổ kho / Biến động tồn kho ra file Excel
 */
export function exportMovementsToExcel(movements: StockMovement[], filename = "so_kho_bien_dong") {
  const headers = [
    "Mã biến động",
    "Tên sách",
    "Loại biến động",
    "Số lượng",
    "Tồn trước",
    "Tồn sau",
    "Chứng từ tham chiếu",
    "Ghi chú",
    "Người thực hiện",
    "Thời gian",
  ];

  const rows = movements.map((m) => [
    m.id,
    m.bookTitle,
    m.type === "IMPORT"
      ? "Nhập kho"
      : m.type === "EXPORT"
        ? "Xuất kho"
        : m.type === "SALE"
          ? "Bán hàng"
          : m.type === "RESTOCK"
            ? "Hoàn kho"
            : "Kiểm kê/Cân bằng",
    m.quantity,
    m.beforeStock,
    m.afterStock,
    m.referenceCode || "",
    m.note || "",
    m.createdBy || "",
    new Date(m.createdAt).toLocaleString("vi-VN"),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = [
    { wch: 12 },
    { wch: 32 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 20 },
    { wch: 35 },
    { wch: 18 },
    { wch: 22 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "SoKho");
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Xuất Nhật ký thao tác đơn hàng (Order History Audit Logs) ra file Excel
 */
export function exportOrderHistoriesToExcel(
  histories: import("@/types").OrderHistoryItem[],
  filename = "nhat_ky_thao_tac_don_hang",
) {
  const headers = [
    "Mã đơn hàng",
    "Loại thao tác",
    "Tiêu đề",
    "Trạng thái trước",
    "Trạng thái sau",
    "Thanh toán trước",
    "Thanh toán sau",
    "Người thực hiện",
    "Vai trò",
    "Diễn giải / Ghi chú",
    "Thời gian",
  ];

  const rows = histories.map((h) => [
    h.orderCode,
    h.action,
    h.title,
    h.fromStatus || "—",
    h.toStatus || "—",
    h.fromPayment || "—",
    h.toPayment || "—",
    h.actor || "Hệ thống",
    h.actorRole || "—",
    h.note || "—",
    new Date(h.createdAt).toLocaleString("vi-VN"),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = [
    { wch: 16 },
    { wch: 18 },
    { wch: 30 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 20 },
    { wch: 14 },
    { wch: 40 },
    { wch: 22 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "NhatKyDonHang");
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
