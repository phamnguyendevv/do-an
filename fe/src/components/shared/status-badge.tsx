import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "error" | "info" | "neutral";

const toneClasses: Record<StatusTone, string> = {
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/15 text-warning border-warning/25",
  error: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-info/10 text-info border-info/20",
  neutral: "bg-muted text-muted-foreground border-border",
};

interface StatusBadgeProps {
  tone?: StatusTone;
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ tone = "neutral", children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
