import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BudgetList } from "@/components/reports/BudgetList";
import { CategoryDonut, CategoryLegend, CategoryStack, MonthBars } from "@/components/reports/Charts";
import { UiShowcase } from "./UiShowcase";

export const metadata: Metadata = { title: "Componentes" };

/** Catálogo de componentes base. Solo existe en desarrollo. */
export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <UiShowcase charts={<ChartsDemo />} />;
}

const CATS = [
  { id: "1", name: "Comida", color: "#0F766E", cents: 612000, percent: 34 },
  { id: "2", name: "Transporte", color: "#1D4ED8", cents: 396000, percent: 22 },
  { id: "3", name: "Entretenimiento", color: "#BE185D", cents: 288000, percent: 16 },
  { id: "4", name: "Compras", color: "#6D28D9", cents: 252000, percent: 14 },
  { id: "5", name: "Salud", color: "#334155", cents: 144000, percent: 8 },
  { id: "6", name: "Servicios", color: "#A16207", cents: 108000, percent: 6 },
];

/** Gráficas y presupuestos con datos de ejemplo. */
function ChartsDemo() {
  const series = [52, 66, 58, 78, 64, 72].map((v, i) => ({
    month: `2026-${String(i + 6).padStart(2, "0")}-01`,
    expenses: v * 25000,
    income: 0,
  }));
  return (
    <div className="grid gap-x-12 gap-y-10 lg:grid-cols-2">
      <section className="flex min-w-0 flex-col gap-4">
        <h2 className="border-b border-line pb-2 font-mono text-xs tracking-[0.08em] text-muted uppercase">Presupuestos</h2>
        <BudgetList
          monthParam="2026-11"
          budgets={[
            { id: "b1", categoryId: "1", name: "Comida", icon: "utensils", color: "#0F766E", limit: 800000, spent: 612000, percent: 76, state: "ok" },
            { id: "b2", categoryId: "2", name: "Transporte", icon: "car", color: "#1D4ED8", limit: 450000, spent: 396000, percent: 88, state: "near" },
            { id: "b3", categoryId: "3", name: "Entretenimiento", icon: "clapperboard", color: "#BE185D", limit: 240000, spent: 288000, percent: 120, state: "over" },
          ]}
        />
      </section>
      <section className="flex min-w-0 flex-col gap-4">
        <h2 className="border-b border-line pb-2 font-mono text-xs tracking-[0.08em] text-muted uppercase">Gráficas</h2>
        <MonthBars series={series} highlight="2026-11-01" />
        <CategoryStack items={CATS} />
        <div className="flex flex-wrap items-center gap-6">
          <CategoryDonut items={CATS} total={1800000} />
          <div className="min-w-0 flex-[1_1_220px]">
            <CategoryLegend items={CATS} />
          </div>
        </div>
      </section>
    </div>
  );
}
