import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ActiveFilter {
  /** Unique key for this filter — used as React key and for removal */
  key: string;
  /** Human-readable label shown in the chip */
  label: string;
  /** Called when the user clicks the × on this chip */
  onRemove: () => void;
}

interface ActiveFilterChipsProps {
  filters: ActiveFilter[];
  /** Called when "Xóa tất cả" is clicked */
  onClearAll?: () => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ActiveFilterChips({
  filters,
  onClearAll,
  className,
}: ActiveFilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5",
        className,
      )}
      role="region"
      aria-label="Các bộ lọc đang kích hoạt"
    >
      <span className="text-xs text-muted-foreground shrink-0">Đang lọc:</span>

      {filters.map((f) => (
        <Badge
          key={f.key}
          variant="secondary"
          className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 h-6 rounded-full text-xs font-normal hover:bg-secondary/80 cursor-default"
        >
          <span className="max-w-[180px] truncate">{f.label}</span>
          <button
            type="button"
            aria-label={`Xóa lọc "${f.label}"`}
            onClick={f.onRemove}
            className="flex-shrink-0 rounded-full ml-0.5 p-0.5 opacity-60 hover:opacity-100 hover:bg-muted transition-opacity"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </Badge>
      ))}

      {filters.length > 1 && onClearAll && (
        <>
          <div className="h-4 w-px bg-border mx-0.5" />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={onClearAll}
          >
            Xóa tất cả
          </Button>
        </>
      )}
    </div>
  );
}
