import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { Suspense } from "react";
import { SavingsView } from "@/components/savings/SavingsView";
import { Skeleton } from "@/components/skeletons/Skeletons";
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
  return <SavingsView goals={goals} schedules={schedules} recent={recent} today={today} />;
}
