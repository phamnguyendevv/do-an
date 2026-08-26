export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(
    value,
  );

export const formatCompactCurrency = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} tỷ ₫`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} tr ₫`;
  return formatCurrency(value);
};

export const formatNumber = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(iso),
  );

export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
