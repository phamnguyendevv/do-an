import type { ExportReceipt, ImportReceipt } from "@/types";

export const suppliers: string[] = [];

export const mockImportReceipts: ImportReceipt[] = Array.from({ length: 12 }).map((_, i) => ({
  id: `IMP-${1000 + i + 1}`,
  supplier: "Nhà cung cấp",
  date: new Date(2026, 7, ((i * 2) % 12) + 1).toISOString(),
  totalItems: 40 + ((i * 17) % 260),
  totalValue: 4_500_000 + ((i * 3_100_000) % 48_000_000),
  note: i % 3 === 0 ? "Nhập bổ sung đầu tháng" : "",
}));

export const mockExportReceipts: ExportReceipt[] = [];

export const inventorySummary = {
  totalStock: 1250,
  lowStock: 4,
  outOfStock: 1,
  inventoryValue: 245_000_000,
};

export const stockMovement = [
  { month: "T3", nhap: 1200, xuat: 980 },
  { month: "T4", nhap: 1420, xuat: 1150 },
  { month: "T5", nhap: 980, xuat: 1240 },
  { month: "T6", nhap: 1650, xuat: 1390 },
  { month: "T7", nhap: 1380, xuat: 1470 },
  { month: "T8", nhap: 1720, xuat: 1520 },
];
