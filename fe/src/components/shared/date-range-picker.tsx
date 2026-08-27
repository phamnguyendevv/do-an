import { useState } from "react";
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
// Quick preset helpers
// ---------------------------------------------------------------------------
function startOf(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}
function endOf(d: Date) {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
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
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getActivePreset(value: DateRange | undefined): string | null {
  if (!value?.from) return null;
  for (const p of DATE_PRESETS) {
    const range = p.resolve();
    const fromMatch = isSameDay(range.from!, value.from);
    const toMatch = range.to && value.to ? isSameDay(range.to, value.to) : !range.to && !value.to;
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
  const activePreset = getActivePreset(value);

  const label = value?.from
    ? value.to
      ? `${formatDate(value.from.toISOString())} – ${formatDate(value.to.toISOString())}`
      : `${formatDate(value.from.toISOString())} – ...`
    : placeholder;

  const handleSelect = (range: DateRange | undefined) => {
    onValueChange(range);
    // Auto-close when a full range (from + to) is selected via calendar
    if (range?.from && range?.to) {
      setOpen(false);
    }
  };

  const handlePreset = (preset: DatePreset) => {
    onValueChange(preset.resolve());
    setOpen(false);
  };

  const handleClear = () => {
    onValueChange(undefined);
    setOpen(false);
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
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
            <CalendarIcon className="h-4 w-4 shrink-0" />
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
                  {DATE_PRESETS.map((p) => (
                    <Button
                      key={p.label}
                      variant={activePreset === p.label ? "secondary" : "ghost"}
                      size="sm"
                      className={cn(
                        "h-8 justify-start text-xs font-normal",
                        activePreset === p.label && "font-semibold text-primary",
                      )}
                      onClick={() => handlePreset(p)}
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
                <Separator orientation="vertical" />
              </>
            )}

            {/* Calendar */}
            <div className="flex flex-col">
              <Calendar
                mode="range"
                numberOfMonths={1}
                {...(value?.from ? { defaultMonth: value.from } : {})}
                {...(value ? { selected: value } : {})}
                onSelect={handleSelect}
                className="p-2 sm:[--cell-size:2.1rem]"
              />
              <div className="flex items-center justify-between border-t px-3 py-2">
                <span className="text-xs text-muted-foreground">
                  {value?.from
                    ? value.to
                      ? `${Math.round((value.to.getTime() - value.from.getTime()) / 86400000) + 1} ngày đã chọn`
                      : "Chọn ngày kết thúc"
                    : "Chọn ngày bắt đầu"}
                </span>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleClear}>
                  Xóa lọc
                </Button>
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
          className="h-9 w-9 shrink-0"
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
export function inDateRange(iso: string | null | undefined, range?: DateRange) {
  if (!range?.from) return true;
  if (!iso) return true;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return true;
  const start = new Date(range.from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(range.to ?? range.from);
  end.setHours(23, 59, 59, 999);
  return t >= start.getTime() && t <= end.getTime();
}
