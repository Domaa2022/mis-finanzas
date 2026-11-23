import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { formatMoney } from "@/lib/money";
import type { MonthPoint } from "@/lib/reports";

const monthShort = (d: string) => format(parseISO(d), "MMM", { locale: es }).replace(".", "").toUpperCase();
const monthLong = (d: string) => format(parseISO(d), "MMMM", { locale: es });

/** Barras de gasto de los últimos 6 meses; el mes actual en `primary`. */
export function MonthBars({ series, highlight }: { series: MonthPoint[]; highlight: string }) {
  const max = Math.max(1, ...series.map((p) => p.expenses));
  const description = series.map((p) => `${monthLong(p.month)}: ${formatMoney(p.expenses, "HNL")}`).join("; ");
  return (
    <figure className="m-0">
      <div role="img" aria-label={`Gasto de los últimos seis meses. ${description}`} className="flex h-[140px] gap-1.5 border-b border-line pt-2 lg:h-[180px]">
        {series.map((p) => {
          const current = p.month === highlight;
          const h = p.expenses === 0 ? 0 : Math.max(4, Math.round((p.expenses / max) * 100));
          return (
            <div key={p.month} className="flex h-full flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-1 items-end justify-center">
                <div
                  className={current ? "w-[70%] max-w-11 rounded-[6px_6px_2px_2px] bg-primary" : "w-[70%] max-w-11 rounded-[6px_6px_2px_2px] bg-line"}
                  style={{ height: `${h}%` }}
                  title={formatMoney(p.expenses, "HNL")}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div aria-hidden className="flex gap-1.5 pt-2">
        {series.map((p) => (
          <span
            key={p.month}
            className={p.month === highlight ? "flex-1 text-center font-mono text-[11px] font-semibold text-ink" : "flex-1 text-center font-mono text-[11px] text-muted"}
          >
            {monthShort(p.month)}
          </span>
        ))}
      </div>
    </figure>
  );
}

export type CategorySlice = { id: string; name: string; color: string; cents: number; percent: number };

function describe(items: CategorySlice[]) {
  return items.map((i) => `${i.name} ${i.percent} %`).join(", ");
}

/** Barra apilada por categoría (móvil). */
export function CategoryStack({ items }: { items: CategorySlice[] }) {
  const total = items.reduce((s, i) => s + i.cents, 0);
  return (
    <div role="img" aria-label={`Distribución del gasto por categoría: ${describe(items)}`} className="flex h-3.5 gap-0.5 overflow-hidden rounded-full">
      {items.map((i) => (
        <div key={i.id} style={{ width: `${(i.cents / total) * 100}%`, backgroundColor: i.color }} />
      ))}
    </div>
  );
}

/** Dona por categoría (web), con el total al centro. SVG sin degradados. */
export function CategoryDonut({ items, total }: { items: CategorySlice[]; total: number }) {
  const r = 15.9155; // circunferencia = 100
  // Cada porción empieza donde terminó la anterior; la primera, arriba (25).
  const segments = items.map((i, index) => {
    const len = total > 0 ? (i.cents / total) * 100 : 0;
    const before = items.slice(0, index).reduce((s, x) => s + (total > 0 ? (x.cents / total) * 100 : 0), 0);
    return { item: i, len, offset: 25 - before };
  });
  return (
    <div role="img" aria-label={`Distribución del gasto por categoría: ${describe(items)}`} className="relative size-40 flex-none">
      <svg viewBox="0 0 42 42" className="size-full" aria-hidden="true">
        <circle cx="21" cy="21" r={r} fill="none" stroke="var(--color-surface-2)" strokeWidth="5" />
        {segments.map(({ item: i, len, offset }) => (
            <circle
              key={i.id}
              cx="21"
              cy="21"
              r={r}
              fill="none"
              stroke={i.color}
              strokeWidth="5"
              strokeDasharray={`${Math.max(0, len - 0.4)} ${100 - Math.max(0, len - 0.4)}`}
              strokeDashoffset={offset}
            />
        ))}
      </svg>
      <div className="absolute inset-[16%] flex flex-col items-center justify-center gap-0.5 rounded-full">
        <span className="text-xs text-ink-3">Total</span>
        <span className="font-mono text-sm font-medium">{formatMoney(total, "HNL")}</span>
      </div>
    </div>
  );
}

/** Lista de categorías con color, porcentaje y monto. */
export function CategoryLegend({ items }: { items: CategorySlice[] }) {
  return (
    <ul className="m-0 list-none p-0">
      {items.map((i) => (
        <li key={i.id} className="flex items-center gap-2.5 border-b border-surface-2 py-2.5 text-sm last:border-0">
          <span aria-hidden className="size-2.5 flex-none rounded-[3px]" style={{ backgroundColor: i.color }} />
          <span className="min-w-0 flex-1 truncate">{i.name}</span>
          <span className="w-11 text-right font-mono text-ink-3">{i.percent} %</span>
          <span className="w-28 text-right font-mono font-medium">{formatMoney(i.cents, "HNL")}</span>
        </li>
      ))}
    </ul>
  );
}
