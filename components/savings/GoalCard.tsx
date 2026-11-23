import Link from "next/link";
import { IconBadge } from "@/components/ui/IconBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatMoney } from "@/lib/money";
import type { Goal } from "@/lib/data/savings";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

function deadlineLabel(date: string | null): string {
  if (!date) return "Sin fecha límite";
  return `Para ${format(parseISO(date), "MMM yyyy", { locale: es }).replace(".", "")}`;
}

/** Tarjeta de una meta con su progreso y el botón "Aportar". */
export function GoalCard({ goal }: { goal: Goal }) {
  const pct = Math.min(100, Math.floor((goal.saved_cents / goal.target_cents) * 100));
  const done = goal.saved_cents >= goal.target_cents;
  return (
    <article className="flex min-w-0 flex-col gap-3.5 rounded-[14px] border border-line bg-white p-4 lg:p-5">
      <div className="flex items-center gap-3">
        <IconBadge name={goal.icon} color={goal.color} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="truncate text-base font-semibold">{goal.name}</h3>
          <span className="text-[13px] text-ink-3">{done ? "¡Meta completada!" : deadlineLabel(goal.target_date)}</span>
        </div>
        <span className="font-mono text-[15px] font-medium">{pct} %</span>
      </div>
      <ProgressBar value={goal.saved_cents} max={goal.target_cents} label={`Progreso de ${goal.name}`} color={goal.color} />
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 font-mono text-[13px] text-ink-2">
          {formatMoney(goal.saved_cents, goal.currency)} de {formatMoney(goal.target_cents, goal.currency)}
        </span>
        <Link
          href={`/ahorros/aportar?meta=${goal.id}`}
          className="flex h-9 flex-none items-center rounded-full border border-line-strong px-3.5 text-[13px] font-semibold text-ink hover:bg-surface hover:text-ink"
          aria-label={`Aportar a ${goal.name}`}
        >
          Aportar
        </Link>
      </div>
    </article>
  );
}
