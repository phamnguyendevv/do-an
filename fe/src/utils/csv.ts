/** Client-side CSV export helpers (frontend-only, no backend required). */

const escapeCell = (value: unknown) => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]) {
  const lines = [
    columns.map((c) => escapeCell(c.header)).join(","),
    ...rows.map((row) => columns.map((c) => escapeCell(c.value(row))).join(",")),
  ];
  return lines.join("\n");
}

export function downloadCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]) {
  if (typeof window === "undefined") return;
  // BOM so Excel reads Vietnamese characters correctly
  const blob = new Blob(["\uFEFF", toCsv(rows, columns)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
