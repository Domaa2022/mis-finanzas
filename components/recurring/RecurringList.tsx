import Link from "next/link";
import { IconBadge } from "@/components/ui/IconBadge";
import { dayMonth } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { dayRuleLabel, dueSoonLabel, RECURRING_FREQUENCY_LABEL } from "@/lib/recurring";
import type { RecurringItem } from "@/lib/data/recurring";
import { cn } from "@/lib/cn";

function amountLabel(r: RecurringItem) {
  return `${r.is_variable ? "≈ " : ""}${formatMoney(r.amount_cents, r.account.currency)}`;
}

function detail(r: RecurringItem) {
  const second = r.is_variable ? "Monto variable" : r.account.name;
  return `${RECURRING_FREQUENCY_LABEL[r.frequency]} · ${dayRuleLabel(r.frequency, r.day_rule)} · ${second}`;
}

function DueBadge({ r, today }: { r: RecurringItem; today: string }) {
  if (!r.active) return <span className="text-xs text-muted">En pausa</span>;
  const soon = dueSoonLabel(r.next_charge_on, today);
  if (soon) {
    return <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-xs font-semibold text-[#92400E]">{soon}</span>;
  }
  return <span className="text-xs text-muted">{dayMonth(r.next_charge_on)}</span>;
}

/** Sección de la lista (Suscripciones o Gastos fijos) con su total mensual. */
export function RecurringSection({
  title,
  monthlyLabel,
  items,
  today,
}: {
  title: string;
  monthlyLabel: string;
  items: RecurringItem[];
  today: string;
}) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col lg:gap-3.5">
      <div className="flex items-baseline justify-between pb-1">
        <h2 className="text-[17px] font-semibold tracking-[-0.01em] lg:text-lg">{title}</h2>
        <span className="font-mono text-[13px] text-ink-3">{monthlyLabel} / mes</span>
      </div>

      <ul className="m-0 list-none p-0 lg:hidden">
        {items.map((r) => (
          <li key={r.id} className="border-b border-surface-2 last:border-0">
            <Link href={`/gastos-fijos/${r.id}`} className={cn("flex items-center gap-3 py-3 text-ink hover:text-ink", !r.active && "opacity-60")}>
              <IconBadge name={r.icon} color={r.color} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[15px] font-semibold">{r.name}</span>
                <span className="truncate text-[13px] text-ink-3">{detail(r)}</span>
              </span>
              <span className="flex flex-none flex-col items-end gap-1">
                <span className="font-mono text-[15px] font-medium">{amountLabel(r)}</span>
                <DueBadge r={r} today={today} />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-[14px] border border-line lg:block">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr className="bg-surface text-left text-ink-3">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Frecuencia</th>
              <th className="px-4 py-3 font-medium">Se cobra de</th>
              <th className="px-4 py-3 font-medium">Próximo cobro</th>
              <th className="px-4 py-3 text-right font-medium">Monto</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className={cn("border-t border-surface-2", !r.active && "opacity-60")}>
                <td className="px-4 py-3">
                  <Link href={`/gastos-fijos/${r.id}`} className="flex items-center gap-3 font-semibold text-ink hover:text-primary">
                    <IconBadge name={r.icon} color={r.color} size="md" />
                    {r.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-2">
                  {RECURRING_FREQUENCY_LABEL[r.frequency]} · {dayRuleLabel(r.frequency, r.day_rule)}
                </td>
                <td className="px-4 py-3 text-ink-2">{r.account.name}</td>
                <td className="px-4 py-3">
                  <DueBadge r={r} today={today} />
                </td>
                <td className="px-4 py-3 text-right font-mono text-[15px] font-medium whitespace-nowrap">{amountLabel(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
