import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Footer } from "@/components/site/Footer";
import { Navigation } from "@/components/site/Navigation";
import { ProductCard } from "@/components/site/ProductCard";
import { categories, products, type ProductCategory } from "@/lib/products";
import { cn } from "@/lib/utils";

const title = "Product Laboratory — IRS";
const description =
  "Every IRS product: capabilities taken apart, understood, and rebuilt as standalone instruments. Status, category and origin for each system.";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const [filter, setFilter] = useState<ProductCategory | "all">("all");
  const list = useMemo(
    () => (filter === "all" ? products : products.filter((p) => p.category === filter)),
    [filter],
  );

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
        <p className="label-mono">Product laboratory</p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Nine systems, one method.
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Each product begins as a feature someone else treats as a checkbox. IRS treats it as a
          discipline: find the capability, understand the underlying problem, go dramatically
          deeper, ship it standalone.
        </p>

        <div className="mt-8 flex flex-wrap gap-1">
          {(["all", ...categories] as const).map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={cn(
                "border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors",
                filter === c
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {c === "all" ? "All" : c}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
