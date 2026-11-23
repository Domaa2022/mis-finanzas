import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ContributionForm } from "@/components/savings/ContributionForm";
import { FormSkeleton } from "@/components/skeletons/Skeletons";
import { buttonClasses } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { getProfile } from "@/lib/data/core";
import { getSavingsOptions } from "@/lib/data/savings-options";

export const metadata: Metadata = { title: "Aportar" };

export default function ContributePage({ searchParams }: PageProps<"/ahorros/aportar">) {
  return (
    <>
      <PageHeader
        title="Aportar"
        subtitle="Mueve dinero de una cuenta a tu meta."
        back={{ href: "/ahorros", label: "Ahorros", close: true }}
      />
      <Suspense
        fallback={
          <Sheet>
            <FormSkeleton fields={3} />
          </Sheet>
        }
      >
        <Contribute searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Contribute({ searchParams }: { searchParams: PageProps<"/ahorros/aportar">["searchParams"] }) {
  const [{ meta }, { goals, accounts }, { today }] = await Promise.all([searchParams, getSavingsOptions(), getProfile()]);
  if (goals.length === 0) {
    return (
      <Sheet>
        <div className="flex max-w-md flex-col gap-4">
          <p className="text-[15px] leading-normal text-ink-2">Aún no tienes metas de ahorro.</p>
          <Link href="/ahorros/nueva-meta" className={buttonClasses({ block: true })}>
            Crear una meta
          </Link>
        </div>
      </Sheet>
    );
  }
  const defaultGoalId = typeof meta === "string" && goals.some((g) => g.value === meta) ? meta : null;
  return <ContributionForm goals={goals} accounts={accounts} defaultGoalId={defaultGoalId} today={today} />;
}
