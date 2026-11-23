import Link from "next/link";
import { Plus } from "lucide-react";
import { GoalCard } from "@/components/savings/GoalCard";
import { ScheduleCard } from "@/components/savings/ScheduleCard";
import { TransactionList } from "@/components/transactions/TransactionList";
import type { Goal, ScheduleItem } from "@/lib/data/savings";
import type { TransactionListItem } from "@/lib/data/transactions";

/** Contenido de Ahorros: programados, metas y aportes recientes. Sin lecturas, para poder verlo con datos de ejemplo. */
export function SavingsView({
  goals,
  schedules,
  recent,
  today,
}: {
  goals: Goal[];
  schedules: ScheduleItem[];
  recent: TransactionListItem[];
  today: string;
}) {
  const schedulesSection = (
    <section className="flex flex-col gap-3 lg:gap-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-semibold tracking-[-0.01em] lg:text-lg">Ahorros programados</h2>
        <Link href="/ahorros/programar" className="text-sm font-semibold">
          Programar
        </Link>
      </div>
      {schedules.length > 0 ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] lg:gap-4">
          {schedules.map((s) => (
            <ScheduleCard key={s.id} schedule={s} />
          ))}
        </div>
      ) : (
        <p className="text-sm leading-normal text-ink-3">
          Programa un aporte automático para una meta o directo a tu cuenta de ahorro, cada semana, quincena o mes.
        </p>
      )}
    </section>
  );

  const goalsSection = (
    <section className="flex flex-col gap-3 lg:gap-3.5">
      <h2 className="mt-3 text-[17px] font-semibold tracking-[-0.01em] lg:mt-0 lg:text-lg">Tus metas</h2>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] lg:gap-4">
        {goals.map((g) => (
          <GoalCard key={g.id} goal={g} />
        ))}
        <Link
          href="/ahorros/nueva-meta"
          className="flex h-[50px] items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-line-strong text-[15px] font-semibold text-ink hover:text-ink lg:min-h-[150px] lg:flex-col lg:rounded-[14px] lg:text-ink-2"
        >
          <Plus aria-hidden size={18} strokeWidth={2} />
          <span className="lg:hidden">Nueva meta</span>
          <span className="hidden lg:inline">Crear una meta</span>
        </Link>
      </div>
    </section>
  );

  return (
    <>
      {/* Móvil: programados primero (diseño `Ahorros`); web: metas primero (`Web-ahorros`). */}
      <div className="flex flex-col gap-3 lg:gap-8">
        <div className="order-1 lg:order-2">{schedulesSection}</div>
        <div className="order-2 lg:order-1">{goalsSection}</div>
      </div>

      <section className="mt-3 flex flex-col gap-3 lg:mt-0 lg:gap-3.5">
        <h2 className="text-[17px] font-semibold tracking-[-0.01em] lg:text-lg">Aportes recientes</h2>
        <TransactionList
          items={recent}
          today={today}
          deletable
          empty={
            <div className="rounded-[14px] border border-line px-4 py-10 text-center text-sm leading-normal text-ink-3">
              <span className="mb-1 block text-[15px] font-semibold text-ink">Aún no hay aportes</span>
              Usa <strong className="font-semibold text-ink">Aportar</strong> en una meta para mover dinero a ella desde tus
              cuentas.
            </div>
          }
        />
      </section>
    </>
  );
}

