export const formatCurrency = (value: number | string | null | undefined) => {
  const num = typeof value === "number" ? value : Number(value) || 0;
  const safeNum = isNaN(num) ? 0 : num;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(safeNum);
};

export const formatCompactCurrency = (value: number | string | null | undefined) => {
  const num = typeof value === "number" ? value : Number(value) || 0;
  const safeNum = isNaN(num) ? 0 : num;
  if (safeNum >= 1_000_000_000) return `${(safeNum / 1_000_000_000).toFixed(2)} tỷ ₫`;
  if (safeNum >= 1_000_000) return `${(safeNum / 1_000_000).toFixed(1)} tr ₫`;
  return formatCurrency(safeNum);
};

export const formatNumber = (value: number | string | null | undefined) => {
  const num = typeof value === "number" ? value : Number(value) || 0;
  const safeNum = isNaN(num) ? 0 : num;
  return new Intl.NumberFormat("vi-VN").format(safeNum);
};

export const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
};

export const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};
