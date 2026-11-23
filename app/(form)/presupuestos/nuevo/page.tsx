import type { Metadata } from "next";
import { Suspense } from "react";
import { BudgetForm } from "@/components/reports/BudgetForm";
import { FormSkeleton } from "@/components/skeletons/Skeletons";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { getCategories } from "@/lib/data/core";
import { getBudgets, getReport, resolveMonth } from "@/lib/data/reports";
import { monthLabel } from "@/lib/dates";

export const metadata: Metadata = { title: "Nuevo presupuesto" };

export default function NewBudgetPage({ searchParams }: PageProps<"/presupuestos/nuevo">) {
  return (
    <>
      <PageHeader
        title="Nuevo presupuesto"
        subtitle="Ponle un límite mensual a una categoría."
        back={{ href: "/presupuestos", label: "Presupuestos", close: true }}
      />
      <Suspense
        fallback={
          <Sheet>
            <FormSkeleton fields={2} />
          </Sheet>
        }
      >
        <NewBudget searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function NewBudget({ searchParams }: { searchParams: PageProps<"/presupuestos/nuevo">["searchParams"] }) {
  const { mes } = await searchParams;
  const { month } = await resolveMonth(mes);
  const [categories, budgets, report] = await Promise.all([getCategories("expense"), getBudgets(month), getReport(month)]);
  const used = new Set(budgets.map((b) => b.categoryId));
  return (
    <BudgetForm
      mode="create"
      month={month}
      monthLabel={monthLabel(month).toLowerCase()}
      categories={categories.filter((c) => !used.has(c.id))}
      spentByCategory={Object.fromEntries(report.byCategory.items.map((i) => [i.id, i.cents]))}
    />
  );
}
