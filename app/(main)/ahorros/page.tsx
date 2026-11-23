import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Suspense } from "react";
import { GoalCard } from "@/components/savings/GoalCard";
import { ScheduleCard } from "@/components/savings/ScheduleCard";
import { Skeleton } from "@/components/skeletons/Skeletons";
import { TransactionList } from "@/components/transactions/TransactionList";
import { Money } from "@/components/ui/Money";
import { HeaderPillLink, PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { getProfile } from "@/lib/data/core";
import { getGoals, getSchedules, totalSaved } from "@/lib/data/savings";
import { getTransactions } from "@/lib/data/transactions";

export const metadata: Metadata = { title: "Ahorros" };

export default function SavingsPage() {
  return (
    <>
      <PageHeader
        title="Ahorros"
        actions={
          <HeaderPillLink href="/ahorros/nueva-meta" solid className="hidden lg:flex">
            <Plus aria-hidden size={18} strokeWidth={2} />
            Nueva meta
          </HeaderPillLink>
        }
      >
        <div className="flex flex-col gap-1 lg:-mt-2">
          <span className="font-mono text-xs tracking-[0.08em] text-on-primary-muted">TOTAL AHORRADO</span>
          <Suspense fallback={<span className="h-10 w-48 animate-pulse rounded bg-white/15" />}>
            <TotalSaved />
          </Suspense>
        </div>
      </PageHeader>

      <Sheet className="gap-3 lg:gap-8">
        <Suspense fallback={<SavingsSkeleton />}>
          <SavingsContent />
        </Suspense>
      </Sheet>
    </>
  );
}

async function TotalSaved() {
  const totals = totalSaved(await getGoals());
  return (
    <span className="flex flex-wrap items-baseline gap-x-4 font-mono text-[34px] font-medium tracking-[-0.02em] lg:text-[40px]">
      <Money cents={totals.HNL} currency="HNL" />
      {totals.USD > 0 && <Money cents={totals.USD} currency="USD" className="text-2xl lg:text-[28px]" />}
    </span>
  );
}

function SavingsSkeleton() {
  return (
    <div role="status" aria-label="Cargando" className="flex flex-col gap-3">
      <Skeleton className="h-[86px] rounded-[14px]" />
      <Skeleton className="h-[130px] rounded-[14px]" />
      <Skeleton className="h-[130px] rounded-[14px]" />
    </div>
  );
}

async function SavingsContent() {
  const [goals, schedules, recent, { today }] = await Promise.all([
    getGoals(),
    getSchedules(),
    getTransactions({ kinds: ["goal_contribution"], limit: 10 }),
    getProfile(),
  ]);

  const schedulesSection = (
    <section className="flex flex-col gap-3 lg:gap-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-semibold tracking-[-0.01em] lg:text-lg">Ahorros programados</h2>
        {goals.length > 0 && (
          <Link href="/ahorros/programar" className="text-sm font-semibold">
            Programar
          </Link>
        )}
      </div>
      {schedules.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] lg:gap-4">
          {schedules.map((s) => (
            <ScheduleCard key={s.id} schedule={s} />
          ))}
        </div>
      ) : (
        <p className="text-sm leading-normal text-ink-3">
          {goals.length > 0
            ? "Programa un aporte automático y tu meta crecerá sola cada quincena o cada mes."
            : "Crea una meta para programar aportes automáticos."}
        </p>
      )}
    </section>
  );

  const goalsSection = (
    <section className="flex flex-col gap-3 lg:gap-3.5">
      <h2 className="mt-3 text-[17px] font-semibold tracking-[-0.01em] lg:mt-0 lg:text-lg">Tus metas</h2>
      <div className="grid gap-3 lg:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] lg:gap-4">
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

