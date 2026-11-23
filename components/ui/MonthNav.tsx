import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { addMonths, monthLabel, monthParam } from "@/lib/dates";

/**
 * Navegación entre meses ("‹ Noviembre 2026 ›") con enlaces `?mes=YYYY-MM`.
 * No deja avanzar más allá del mes actual.
 */
export function MonthNav({
  month,
  currentMonth,
  basePath,
  params = {},
  tone = "on-primary",
  className,
}: {
  /** Primer día del mes mostrado. */
  month: string;
  /** Primer día del mes actual. */
  currentMonth: string;
  basePath: string;
  /** Otros parámetros a conservar (cuenta…). */
  params?: Record<string, string | undefined>;
  tone?: "on-primary" | "default";
  className?: string;
}) {
  const href = (m: string) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    if (m !== currentMonth) q.set("mes", monthParam(m));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const prev = addMonths(month, -1);
  const next = addMonths(month, 1);
  const canNext = month < currentMonth;
  const onPrimary = tone === "on-primary";
  const btn = cn(
    "flex size-11 items-center justify-center rounded-full",
    onPrimary ? "text-white hover:bg-white/10 hover:text-white" : "text-ink hover:bg-surface-2 hover:text-ink",
  );

  return (
    <nav aria-label="Cambiar de mes" className={cn("flex items-center gap-1", className)}>
      <Link href={href(prev)} aria-label={`Mes anterior: ${monthLabel(prev)}`} className={btn}>
        <ChevronLeft aria-hidden size={22} strokeWidth={2} />
      </Link>
      <span
        aria-current="date"
        className={cn("min-w-36 text-center font-mono text-sm tracking-[0.04em] uppercase", onPrimary ? "text-white" : "text-ink")}
      >
        {monthLabel(month)}
      </span>
      {canNext ? (
        <Link href={href(next)} aria-label={`Mes siguiente: ${monthLabel(next)}`} className={btn}>
          <ChevronRight aria-hidden size={22} strokeWidth={2} />
        </Link>
      ) : (
        <span aria-hidden className={cn(btn, "opacity-30")}>
          <ChevronRight size={22} strokeWidth={2} />
        </span>
      )}
    </nav>
  );
}
