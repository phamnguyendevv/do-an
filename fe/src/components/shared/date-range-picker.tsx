import { CalendarIcon, X } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDate } from "@/utils/format";

export type { DateRange };

interface DateRangePickerProps {
  value: DateRange | undefined;
  onValueChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function DateRangePicker({
  value,
  onValueChange,
  placeholder = "Chọn khoảng ngày",
  className,
}: DateRangePickerProps) {
  const label = value?.from
    ? value.to
      ? `${formatDate(value.from.toISOString())} – ${formatDate(value.to.toISOString())}`
      : `${formatDate(value.from.toISOString())} – ...`
    : placeholder;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 justify-start font-normal",
              !value?.from && "text-muted-foreground",
            )}
            aria-label="Lọc theo khoảng ngày"
          >
            <CalendarIcon className="mr-1.5 h-4 w-4" />
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            numberOfMonths={1}
            {...(value?.from ? { defaultMonth: value.from } : {})}
            {...(value ? { selected: value } : {})}
            onSelect={onValueChange}
            className="p-2 sm:[--cell-size:2.1rem]"
          />
          <div className="flex justify-end border-t p-2">
            <Button variant="ghost" size="sm" onClick={() => onValueChange(undefined)}>
              Xóa lọc
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      {value?.from ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          aria-label="Xóa khoảng ngày"
          onClick={() => onValueChange(undefined)}
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

/** True when the ISO date falls inside the (inclusive) selected range. */
export function inDateRange(iso: string, range?: DateRange) {
  if (!range?.from) return true;
  const t = new Date(iso).getTime();
  const start = new Date(range.from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(range.to ?? range.from);
  end.setHours(23, 59, 59, 999);
  return t >= start.getTime() && t <= end.getTime();
}
