import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface SearchInputProps {
  value?: string;
  onValueChange?: (value: string) => void;
  /** Called when the user presses Enter */
  onSubmit?: (value: string) => void;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}

export function SearchInput({
  value,
  onValueChange,
  onSubmit,
  placeholder = "Tìm kiếm...",
  className,
  "aria-label": ariaLabel = "Tìm kiếm",
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit?.((e.target as HTMLInputElement).value);
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="h-9 pl-9"
      />
    </div>
  );
}
