import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BudgetForm } from "@/components/reports/BudgetForm";
import { FormSkeleton } from "@/components/skeletons/Skeletons";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { getBudgets, getReport, resolveMonth } from "@/lib/data/reports";
import { monthLabel } from "@/lib/dates";

export const metadata: Metadata = { title: "Editar presupuesto" };

export default function EditBudgetPage({ params, searchParams }: PageProps<"/presupuestos/[id]">) {
  return (
    <>
      <PageHeader title="Editar presupuesto" back={{ href: "/presupuestos", label: "Presupuestos", close: true }} />
      <Suspense
        fallback={
          <Sheet>
            <FormSkeleton fields={1} />
          </Sheet>
        }
      >
        <EditBudget params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function EditBudget({
  params,
  searchParams,
}: {
  params: PageProps<"/presupuestos/[id]">["params"];
  searchParams: PageProps<"/presupuestos/[id]">["searchParams"];
}) {
  const [{ id }, { mes }] = await Promise.all([params, searchParams]);
  const { month } = await resolveMonth(mes);
  const [budgets, report] = await Promise.all([getBudgets(month), getReport(month)]);
  const b = budgets.find((x) => x.id === id);
  if (!b) notFound();
  return (
    <BudgetForm
      mode="edit"
      id={b.id}
      categoryId={b.categoryId}
      limit={b.limit}
      month={month}
      monthLabel={`${b.name} en ${monthLabel(month).toLowerCase()}`}
      categories={[]}
      spentByCategory={Object.fromEntries(report.byCategory.items.map((i) => [i.id, i.cents]))}
    />
  );
}
