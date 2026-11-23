import { ArrowLeftRight, Target } from "lucide-react";
import { IconBadge } from "@/components/ui/IconBadge";
import { Money } from "@/components/ui/Money";
import { cn } from "@/lib/cn";
import type { TransactionListItem } from "@/lib/data/transactions";
import { dayMonth, relativeDayLabel } from "@/lib/dates";
import { DeleteTransactionButton } from "./DeleteTransactionButton";

/** Texto principal de un movimiento. */
export function describeTransaction(t: TransactionListItem): string {
  if (t.note) return t.note;
  switch (t.kind) {
    case "transfer_out":
      return t.counterpart ? `Transferencia a ${t.counterpart}` : "Transferencia enviada";
    case "transfer_in":
      return t.counterpart ? `Transferencia desde ${t.counterpart}` : "Transferencia recibida";
    case "goal_contribution":
      return t.counterpart ? `Aporte a ${t.counterpart}` : "Aporte a meta";
    default:
      return t.category?.name ?? (t.kind === "income" ? "Ingreso" : "Gasto");
  }
}

function signedCents(t: TransactionListItem): number {
  return t.kind === "income" || t.kind === "transfer_in" ? t.amount_cents : -t.amount_cents;
}

function Badge({ t, size = "lg" }: { t: TransactionListItem; size?: "md" | "lg" }) {
  if (t.kind === "transfer_in" || t.kind === "transfer_out") {
    return <IconBadge icon={ArrowLeftRight} color="#52525B" size={size} />;
  }
  if (t.kind === "goal_contribution") return <IconBadge icon={Target} color={t.account.color} size={size} />;
  return <IconBadge name={t.category?.icon} color={t.category?.color ?? "#52525B"} size={size} />;
}

function Amount({ t, className }: { t: TransactionListItem; className?: string }) {
  const cents = signedCents(t);
  return (
    <Money
      cents={cents}
      currency={t.account.currency}
      signDisplay="always"
      className={cn(t.kind === "income" ? "text-teal" : "text-ink", className)}
    />
  );
}

type Props = {
  items: TransactionListItem[];
  today: string;
  /** Agrupa por día con encabezados ("Hoy", "Ayer"…). */
  grouped?: boolean;
  /** Permite borrar gastos e ingresos. */
  deletable?: boolean;
  /** Mensaje cuando no hay movimientos. */
  empty?: React.ReactNode;
};

/** Lista de movimientos: filas en móvil y tabla en web. */
export function TransactionList({ items, today, grouped = false, deletable = false, empty }: Props) {
  if (items.length === 0) return <>{empty}</>;

  const groups: { date: string; items: TransactionListItem[] }[] = [];
  for (const t of items) {
    const last = groups.at(-1);
    if (grouped && last?.date === t.occurred_on) last.items.push(t);
    else if (grouped) groups.push({ date: t.occurred_on, items: [t] });
  }
  if (!grouped) groups.push({ date: "", items });

  return (
    <>
      <div className="flex flex-col gap-2 lg:hidden">
        {groups.map((g) => (
          <section key={g.date || "all"} aria-label={g.date ? relativeDayLabel(g.date, today) : undefined}>
            {g.date && (
              <h3 className="pt-2 pb-1 font-mono text-xs tracking-[0.08em] text-muted uppercase">
                {relativeDayLabel(g.date, today)}
              </h3>
            )}
            <ul className="m-0 list-none p-0">
              {g.items.map((t) => (
                <li key={t.id} className="flex items-center gap-3 border-b border-surface-2 py-3 last:border-0">
                  <Badge t={t} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[15px] font-semibold">{describeTransaction(t)}</span>
                    <span className="truncate text-[13px] text-ink-3">
                      {t.account.name}
                      {!grouped && ` · ${dayMonth(t.occurred_on)}`}
                    </span>
                  </span>
                  <Amount t={t} className="text-[15px]" />
                  {deletable && (t.kind === "expense" || t.kind === "income") && (
                    <DeleteTransactionButton id={t.id} label={describeTransaction(t)} />
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-[14px] border border-line lg:block">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="bg-surface text-left text-ink-3">
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Descripción</th>
              <th className="px-4 py-3 font-medium">Cuenta</th>
              <th className="px-4 py-3 text-right font-medium">Monto</th>
              {deletable && (
                <th className="px-2 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id} className="border-t border-surface-2">
                <td className="px-4 py-3 font-mono text-[13px] whitespace-nowrap text-ink-3">{dayMonth(t.occurred_on)}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-3">
                    <Badge t={t} size="md" />
                    <span className="flex min-w-0 flex-col">
                      <span className="font-semibold">{describeTransaction(t)}</span>
                      {t.note && t.category && <span className="text-xs text-muted">{t.category.name}</span>}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-2">{t.account.name}</td>
                <td className="px-4 py-3 text-right">
                  <Amount t={t} className="text-[15px]" />
                </td>
                {deletable && (
                  <td className="w-[52px] px-2 py-1 text-right">
                    {(t.kind === "expense" || t.kind === "income") && (
                      <DeleteTransactionButton id={t.id} label={describeTransaction(t)} />
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
