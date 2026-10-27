import { useState, useEffect } from "react";
import { CalendarIcon, ChevronDown, X } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatDate } from "@/utils/format";

export type { DateRange };

// ---------------------------------------------------------------------------
// Quick preset helpers & time normalizers
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Helpers to detect which preset is active
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface DateRangePickerProps {
  value: DateRange | undefined;
  onValueChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
  /** Show preset quick buttons. Default: true */
  showPresets?: boolean;
}

export function DateRangePicker({
  value,
  onValueChange,
  placeholder = "Chọn khoảng ngày",
  className,
  showPresets = true,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>(value);

  // Keep pendingRange in sync with value whenever popover opens or prop changes
  useEffect(() => {
    setPendingRange(value);
  }, [value, open]);

  const activePreset = getActivePreset(value);
  const label = formatDateRange(value, placeholder);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      // If user closed popover while having selected a start day without end day
      if (pendingRange?.from && !pendingRange.to) {
        const single = {
          from: startOf(pendingRange.from),
          to: endOf(pendingRange.from),
        };
        onValueChange(single);
      }
    }
    setOpen(nextOpen);
  };

  const handleSelect = (range: DateRange | undefined, selectedDay: Date) => {
    // If react-day-picker unselects (user clicked start day again)
    if (!range) {
      const single = { from: startOf(selectedDay), to: endOf(selectedDay) };
      setPendingRange(single);
      onValueChange(single);
      setOpen(false);
      return;
    }

    // If user clicked the same day when from was already chosen
    if (pendingRange?.from && isSameDay(pendingRange.from, selectedDay) && !pendingRange.to) {
      const single = { from: startOf(selectedDay), to: endOf(selectedDay) };
      setPendingRange(single);
      onValueChange(single);
      setOpen(false);
      return;
    }

    // If both from and to are selected (a range)
    if (range.from && range.to) {
      const normalized = {
        from: startOf(range.from),
        to: endOf(range.to),
      };
      setPendingRange(normalized);
      onValueChange(normalized);
      setOpen(false);
      return;
    }

    // Only from is selected so far:
    const partial = { from: startOf(range.from), to: undefined };
    setPendingRange(partial);
  };

  const handleApplyPending = () => {
    if (pendingRange?.from) {
      const finalized = {
        from: startOf(pendingRange.from),
        to: endOf(pendingRange.to ?? pendingRange.from),
      };
      setPendingRange(finalized);
      onValueChange(finalized);
      setOpen(false);
    }
  };

  const handlePreset = (preset: DatePreset) => {
    const range = preset.resolve();
    setPendingRange(range);
    onValueChange(range);
    setOpen(false);
  };

  const handleClear = () => {
    setPendingRange(undefined);
    onValueChange(undefined);
    setOpen(false);
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id="date-range-picker-trigger"
            variant="outline"
            size="sm"
            className={cn(
              "h-9 justify-start gap-1.5 font-normal",
              !value?.from && "text-muted-foreground",
            )}
            aria-label="Lọc theo khoảng ngày"
          >
            <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate max-w-[200px]">{label}</span>
            {value?.from && (
              <span className="ml-auto rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary leading-none">
                {activePreset ?? "Tùy chọn"}
              </span>
            )}
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {/* Preset sidebar */}
            {showPresets && (
              <>
                <div className="flex flex-col gap-0.5 p-2 min-w-[120px]">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Chọn nhanh
                  </p>
                  {DATE_PRESETS.map((p) => {
                    const isPresetActive = activePreset === p.label;
                    return (
                      <Button
                        key={p.label}
                        variant={isPresetActive ? "secondary" : "ghost"}
                        size="sm"
                        className={cn(
                          "h-8 justify-start text-xs font-normal",
                          isPresetActive && "font-semibold text-primary",
                        )}
                        onClick={() => handlePreset(p)}
                      >
                        {p.label}
                      </Button>
                    );
                  })}
                </div>
                <Separator orientation="vertical" />
              </>
            )}

            {/* Calendar */}
            <div className="flex flex-col">
              <Calendar
                mode="range"
                numberOfMonths={1}
                {...(pendingRange?.from ? { defaultMonth: pendingRange.from } : {})}
                {...(pendingRange ? { selected: pendingRange } : {})}
                onSelect={handleSelect}
                className="p-2 sm:[--cell-size:2.1rem]"
              />
              <div className="flex items-center justify-between border-t px-3 py-2 gap-2">
                <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                  {pendingRange?.from
                    ? pendingRange.to
                      ? isSameDay(pendingRange.from, pendingRange.to)
                        ? "1 ngày đã chọn"
                        : `${Math.round((pendingRange.to.getTime() - pendingRange.from.getTime()) / 86400000) + 1} ngày đã chọn`
                      : "Chọn ngày kết thúc"
                    : "Chọn ngày bắt đầu"}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {pendingRange?.from ? (
                    <Button
                      variant="default"
                      size="sm"
                      className="h-7 text-xs px-2.5"
                      onClick={handleApplyPending}
                    >
                      Áp dụng
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={handleClear}
                  >
                    Xóa lọc
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear button outside popover */}
      {value?.from ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Xóa khoảng ngày"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
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
