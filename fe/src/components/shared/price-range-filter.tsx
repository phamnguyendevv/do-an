import { useState } from "react";
import { ChevronDown, DollarSign, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatCompactCurrency } from "@/utils/format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface PriceRange {
  min?: number;
  max?: number;
}

interface PricePreset {
  label: string;
  range: PriceRange;
}

const PRICE_PRESETS: PricePreset[] = [
  { label: "Dưới 50.000₫", range: { max: 50_000 } },
  { label: "50.000 – 150.000₫", range: { min: 50_000, max: 150_000 } },
  { label: "150.000 – 300.000₫", range: { min: 150_000, max: 300_000 } },
  { label: "300.000 – 500.000₫", range: { min: 300_000, max: 500_000 } },
  { label: "Trên 500.000₫", range: { min: 500_000 } },
];

function rangesEqual(a: PriceRange, b: PriceRange) {
  return a.min === b.min && a.max === b.max;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface PriceRangeFilterProps {
  value: PriceRange;
  onValueChange: (range: PriceRange) => void;
  /** Label text shown in the trigger button */
  label?: string;
  className?: string;
}

export function PriceRangeFilter({
  value,
  onValueChange,
  label = "Khoảng giá",
  className,
}: PriceRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [localMin, setLocalMin] = useState(value.min !== undefined ? String(value.min) : "");
  const [localMax, setLocalMax] = useState(value.max !== undefined ? String(value.max) : "");

  const hasFilter = value.min !== undefined || value.max !== undefined;
  const activePreset = PRICE_PRESETS.find((p) => rangesEqual(p.range, value));

  const displayLabel = hasFilter
    ? (activePreset?.label ??
      ([
        value.min !== undefined ? `Từ ${formatCompactCurrency(value.min)}` : null,
        value.max !== undefined ? `đến ${formatCompactCurrency(value.max)}` : null,
      ]
        .filter(Boolean)
        .join(" ") ||
        label))
    : label;

  const applyCustom = () => {
    const min = localMin.trim() !== "" ? Number(localMin.replace(/\D/g, "")) : undefined;
    const max = localMax.trim() !== "" ? Number(localMax.replace(/\D/g, "")) : undefined;
    const next: PriceRange = {};
    if (min !== undefined) next.min = min;
    if (max !== undefined) next.max = max;
    onValueChange(next);
    setOpen(false);
  };

  const applyPreset = (preset: PricePreset) => {
    onValueChange(preset.range);
    setLocalMin(preset.range.min !== undefined ? String(preset.range.min) : "");
    setLocalMax(preset.range.max !== undefined ? String(preset.range.max) : "");
    setOpen(false);
  };

  const clearFilter = () => {
    onValueChange({});
    setLocalMin("");
    setLocalMax("");
    setOpen(false);
  };

  const onOpenChange = (o: boolean) => {
    if (o) {
      // Sync local state when opening
      setLocalMin(value.min !== undefined ? String(value.min) : "");
      setLocalMax(value.max !== undefined ? String(value.max) : "");
    }
    setOpen(o);
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id="price-range-filter-trigger"
            variant="outline"
            size="sm"
            className={cn(
              "h-9 justify-start gap-1.5 font-normal",
              !hasFilter && "text-muted-foreground",
            )}
            aria-label="Lọc theo khoảng giá"
          >
            <DollarSign className="h-4 w-4 shrink-0" />
            <span className="truncate max-w-[160px]">{displayLabel}</span>
            {hasFilter && (
              <span className="ml-auto rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary leading-none">
                Đã lọc
              </span>
            )}
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-72 p-0" align="start">
          {/* Presets */}
          <div className="p-3 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Mức giá phổ biến
            </p>
            <div className="grid grid-cols-1 gap-1">
              {PRICE_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant={rangesEqual(preset.range, value) ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-8 justify-start text-xs font-normal",
                    rangesEqual(preset.range, value) && "font-semibold text-primary",
                  )}
                  onClick={() => applyPreset(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Custom input */}
          <div className="p-3 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Tùy chỉnh (VNĐ)
            </p>
            <div className="flex items-center gap-2">
              <Input
                id="price-min-input"
                placeholder="Từ"
                value={localMin}
                onChange={(e) => setLocalMin(e.target.value)}
                className="h-8 text-xs"
                type="number"
                min={0}
              />
              <span className="text-muted-foreground text-xs shrink-0">–</span>
              <Input
                id="price-max-input"
                placeholder="Đến"
                value={localMax}
                onChange={(e) => setLocalMax(e.target.value)}
                className="h-8 text-xs"
                type="number"
                min={0}
              />
            </div>
            <div className="flex justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={clearFilter}
                disabled={!hasFilter && !localMin && !localMax}
              >
                Đặt lại
              </Button>
              <Button size="sm" className="h-7 text-xs flex-1" onClick={applyCustom}>
                Áp dụng
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Inline clear */}
      {hasFilter ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          aria-label="Xóa lọc giá"
          onClick={clearFilter}
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
