import Link from "next/link";
import { IconBadge } from "@/components/ui/IconBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/cn";
import type { BudgetView } from "@/lib/data/reports";
import { formatMoney } from "@/lib/money";
import { BUDGET_STATE_LABEL } from "@/lib/reports";

/** Presupuestos por categoría con su estado (regla 9). */
export function BudgetList({ budgets, monthParam }: { budgets: BudgetView[]; monthParam: string }) {
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {budgets.map((b) => {
        const warn = b.state !== "ok";
        return (
          <li key={b.id} className="border-b border-surface-2 last:border-0">
            <Link href={`/presupuestos/${b.id}?mes=${monthParam}`} className="flex flex-col gap-2.5 py-3.5 text-ink hover:text-ink">
              <span className="flex items-center gap-3">
                <IconBadge name={b.icon} color={b.color} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[15px] font-semibold">{b.name}</span>
                  <span className={cn("text-[13px]", warn ? "text-warn" : "text-ink-3")}>{BUDGET_STATE_LABEL[b.state]}</span>
                </span>
                <span className="flex flex-col items-end gap-0.5">
                  <span className="font-mono text-sm font-medium">{formatMoney(b.spent, "HNL")}</span>
                  <span className="font-mono text-xs text-muted">de {formatMoney(b.limit, "HNL")}</span>
                </span>
              </span>
              <span className="flex items-center gap-2.5">
                <ProgressBar
                  className="flex-1"
                  value={b.spent}
                  max={b.limit}
                  label={`Presupuesto de ${b.name}`}
                  valueText={`${b.percent} %, ${BUDGET_STATE_LABEL[b.state]}`}
                  color={b.state === "over" ? "var(--color-warn-bar)" : b.color}
                />
                <span className="w-11 text-right font-mono text-xs text-ink-3">{b.percent} %</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
