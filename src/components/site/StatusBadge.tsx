import { STATUS_LABEL, type ProductStatus } from "@/lib/products";
import { cn } from "@/lib/utils";

const STYLE: Record<ProductStatus, string> = {
  live: "border-[var(--ok)]/50 text-[var(--ok)] bg-[var(--ok)]/10",
  building: "border-[var(--warn)]/50 text-[var(--warn)] bg-[var(--warn)]/10",
  research: "border-border text-muted-foreground bg-secondary/40",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ProductStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]",
        STYLE[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}
