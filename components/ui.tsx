import type { Category } from "@/lib/types";
import { CATEGORY_STYLES } from "@/lib/categories";

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_STYLES[category].badge}`}>
      {category}
    </span>
  );
}

export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {title && <h2 className="mb-4 text-sm font-semibold text-slate-900">{title}</h2>}
      {children}
    </section>
  );
}

export function LoadingState({ label = "Loading your expenses..." }: { label?: string }) {
  return (
    <div role="status" className="space-y-4" aria-label={label}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-slate-200" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
