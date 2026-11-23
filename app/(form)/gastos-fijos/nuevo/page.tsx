import type { Metadata } from "next";
import { Suspense } from "react";
import { RecurringForm } from "@/components/recurring/RecurringForm";
import { FormSkeleton } from "@/components/skeletons/Skeletons";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { getProfile } from "@/lib/data/core";
import { getRecurringOptions } from "@/lib/data/recurring-options";

export const metadata: Metadata = { title: "Nuevo gasto fijo" };

export default function NewRecurringPage() {
  return (
    <>
      <PageHeader
        title="Nuevo gasto fijo"
        subtitle="Suscripciones y pagos que se repiten."
        back={{ href: "/gastos-fijos", label: "Gastos fijos", close: true }}
      />
      <Suspense
        fallback={
          <Sheet>
            <FormSkeleton fields={6} />
          </Sheet>
        }
      >
        <NewRecurring />
      </Suspense>
    </>
  );
}

async function NewRecurring() {
  const [{ accounts, categories }, { today }] = await Promise.all([getRecurringOptions(), getProfile()]);
  return <RecurringForm mode="create" accounts={accounts} categories={categories} today={today} />;
}
