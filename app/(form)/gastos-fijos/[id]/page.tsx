import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RecurringForm } from "@/components/recurring/RecurringForm";
import { FormSkeleton } from "@/components/skeletons/Skeletons";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { getProfile } from "@/lib/data/core";
import { getRecurring } from "@/lib/data/recurring";
import { getRecurringOptions } from "@/lib/data/recurring-options";

export const metadata: Metadata = { title: "Editar gasto fijo" };

export default function EditRecurringPage({ params }: PageProps<"/gastos-fijos/[id]">) {
  return (
    <>
      <PageHeader title="Editar gasto fijo" back={{ href: "/gastos-fijos", label: "Gastos fijos", close: true }} />
      <Suspense
        fallback={
          <Sheet>
            <FormSkeleton fields={6} />
          </Sheet>
        }
      >
        <EditRecurring params={params} />
      </Suspense>
    </>
  );
}

async function EditRecurring({ params }: { params: PageProps<"/gastos-fijos/[id]">["params"] }) {
  const { id } = await params;
  const [items, { accounts, categories }, { today }] = await Promise.all([getRecurring(), getRecurringOptions(), getProfile()]);
  const r = items.find((x) => x.id === id);
  if (!r) notFound();
  return (
    <RecurringForm
      mode="edit"
      id={r.id}
      active={r.active}
      accounts={accounts}
      categories={categories}
      today={today}
      values={{
        kind: r.kind,
        name: r.name,
        amount: r.amount_cents,
        isVariable: r.is_variable,
        accountId: r.account_id,
        categoryId: r.category_id ?? categories[0]?.id ?? "",
        frequency: r.frequency,
        dayRule: r.day_rule,
        remindDaysBefore: r.remind_days_before,
        autoRegister: r.auto_register,
      }}
    />
  );
}
