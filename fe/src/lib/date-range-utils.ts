import type { DateRange } from "react-day-picker";

import { formatDate } from "@/utils/format";

export type { DateRange };

export function startOf(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function endOf(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Normalize a DateRange so that from is start-of-day (00:00:00) and to is end-of-day (23:59:59) */
export function normalizeDateRange(range: DateRange | undefined): DateRange | undefined {
  if (!range?.from) return undefined;
  const from = startOf(range.from);
  const to = endOf(range.to ?? range.from);
  return { from, to };
}

/** Converts DateRange into API query parameters (startDate and endDate in ISO format) */
export function toApiDateRange(range: DateRange | undefined): {
  startDate?: string;
  endDate?: string;
} {
  if (!range?.from) return {};
  const norm = normalizeDateRange(range);
  if (!norm?.from || !norm?.to) return {};
  return {
    startDate: norm.from.toISOString(),
    endDate: norm.to.toISOString(),
  };
}

/** Format a DateRange for display in labels, chips, or trigger buttons */
export function formatDateRange(
  range: DateRange | undefined,
  placeholder = "Chọn khoảng ngày",
): string {
  if (!range?.from) return placeholder;
  const fromStr = formatDate(range.from.toISOString());
  if (!range.to || isSameDay(range.from, range.to)) {
    return fromStr;
  }
  const toStr = formatDate(range.to.toISOString());
  return `${fromStr} – ${toStr}`;
}

export interface DatePreset {
  label: string;
  resolve: () => DateRange;
}

export const DATE_PRESETS: DatePreset[] = [
  {
    label: "Hôm nay",
    resolve: () => {
      const now = new Date();
      return { from: startOf(now), to: endOf(now) };
    },
  },
  {
    label: "Hôm qua",
    resolve: () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return { from: startOf(d), to: endOf(d) };
    },
  },
  {
    label: "7 ngày qua",
    resolve: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 6);
      return { from: startOf(from), to: endOf(to) };
    },
  },
  {
    label: "Tuần này",
    resolve: () => {
      const now = new Date();
      const day = now.getDay();
      // Monday as first day of week (1: Monday, ..., 0: Sunday)
      const diff = now.getDate() - (day === 0 ? 6 : day - 1);
      const monday = new Date(now.getFullYear(), now.getMonth(), diff);
      return { from: startOf(monday), to: endOf(now) };
    },
  },
  {
    label: "30 ngày qua",
    resolve: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 29);
      return { from: startOf(from), to: endOf(to) };
    },
  },
  {
    label: "Tháng này",
    resolve: () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: startOf(from), to: endOf(to) };
    },
  },
  {
    label: "Tháng trước",
    resolve: () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: startOf(from), to: endOf(to) };
    },
  },
];

export function getActivePreset(value: DateRange | undefined): string | null {
  if (!value?.from) return null;
  const norm = normalizeDateRange(value);
  if (!norm?.from || !norm?.to) return null;

  for (const p of DATE_PRESETS) {
    const range = p.resolve();
    const fromMatch = isSameDay(range.from!, norm.from);
    const toMatch = isSameDay(range.to!, norm.to);
    if (fromMatch && toMatch) return p.label;
  }
  return null;
}

/** True when the ISO date falls inside the (inclusive) selected range. */
export function inDateRange(iso: string | null | undefined, range?: DateRange): boolean {
  if (!range?.from) return true;
  if (!iso) return true;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return true;
  const start = startOf(range.from).getTime();
  const end = endOf(range.to ?? range.from).getTime();
  return t >= start && t <= end;
}
