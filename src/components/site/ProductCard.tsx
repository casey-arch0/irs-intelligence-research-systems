import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { Product } from "@/lib/products";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="panel group relative flex flex-col p-5 transition-colors hover:border-primary/50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold tracking-tight">{product.name}</h3>
          <p className="mt-0.5 text-sm text-primary/90">{product.tagline}</p>
        </div>
        <StatusBadge status={product.status} />
      </div>

      <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
        {product.description}
      </p>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-3">
        <div className="min-w-0">
          <p className="label-mono truncate">{product.category}</p>
          <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground/80">
            {product.origin}
          </p>
        </div>
        {product.href === "/analyze" ? (
          <Link
            to="/analyze"
            className="inline-flex shrink-0 items-center gap-1.5 border border-primary/60 bg-primary/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary/20"
          >
            Open <ArrowRight className="h-3 w-3" />
          </Link>
        ) : (
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            In laboratory
          </span>
        )}
      </div>
    </article>
  );
}
