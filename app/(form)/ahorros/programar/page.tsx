import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ScheduleForm } from "@/components/savings/ScheduleForm";
import { FormSkeleton } from "@/components/skeletons/Skeletons";
import { buttonClasses } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { getProfile } from "@/lib/data/core";
import { getSavingsOptions } from "@/lib/data/savings-options";

export const metadata: Metadata = { title: "Programar ahorro" };

export default function SchedulePage({ searchParams }: PageProps<"/ahorros/programar">) {
  return (
    <>
      <PageHeader
        title="Programar ahorro"
        subtitle="Aparta dinero para una meta o una cuenta de forma automática."
        back={{ href: "/ahorros", label: "Ahorros", close: true }}
      />
      <Suspense
        fallback={
          <Sheet>
            <FormSkeleton fields={6} />
          </Sheet>
        }
      >
        <Schedule searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Schedule({ searchParams }: { searchParams: PageProps<"/ahorros/programar">["searchParams"] }) {
  const [{ meta }, { goals, accounts }, { today }] = await Promise.all([searchParams, getSavingsOptions(), getProfile()]);
  // Sin metas, el ahorro puede ir a una cuenta: hacen falta al menos dos cuentas.
  if (goals.length === 0 && accounts.length < 2) {
    return (
      <Sheet>
        <div className="flex max-w-md flex-col gap-4">
          <p className="text-[15px] leading-normal text-ink-2">
            El ahorro programado aparta dinero para una meta o lo pasa a otra cuenta. Crea una meta o agrega una cuenta
            de ahorro para empezar.
          </p>
          <Link href="/ahorros/nueva-meta" className={buttonClasses({ block: true })}>
            Crear una meta
          </Link>
          <Link href="/cuentas/nueva" className={buttonClasses({ block: true, variant: "secondary" })}>
            Agregar una cuenta
          </Link>
        </div>
      </Sheet>
    );
  }
  const defaultGoalId = typeof meta === "string" && goals.some((g) => g.value === meta) ? meta : null;
  return <ScheduleForm goals={goals} accounts={accounts} defaultGoalId={defaultGoalId} today={today} />;
}
