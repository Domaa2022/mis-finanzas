import "server-only";
import { cache } from "react";
import { addMonths, endOfMonth, parseMonthParam, startOfMonth } from "@/lib/dates";
import { budgetState, expensesByCategory, monthlySeries, usedPercent, type BudgetState, type ReportMovement } from "@/lib/reports";
import { db, getCategories, getProfile } from "./core";
import { getTransactions } from "./transactions";

/** Mes pedido en `?mes=YYYY-MM`, sin pasar del mes actual. */
export async function resolveMonth(mes: string | string[] | undefined) {
  const { today } = await getProfile();
  const current = startOfMonth(today);
  const requested = parseMonthParam(typeof mes === "string" ? mes : null);
  return { month: requested && requested <= current ? requested : current, current, today };
}

/** Movimientos de los últimos 6 meses hasta `month` (gastos e ingresos; regla 1). */
export const getReportMovements = cache(async (month: string): Promise<ReportMovement[]> => {
  const items = await getTransactions({
    from: addMonths(month, -5),
    to: endOfMonth(month),
    kinds: ["expense", "income", "goal_contribution"],
  });
  return items.map((t) => ({
    kind: t.kind,
    amount_cents: t.amount_cents,
    occurred_on: t.occurred_on,
    currency: t.account.currency,
    category: t.category ? { id: t.category.id, name: t.category.name, color: t.category.color } : null,
  }));
});

export type BudgetView = {
  id: string;
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  limit: number;
  spent: number;
  percent: number;
  state: BudgetState;
};

/** Presupuestos del mes con lo gastado en lempiras por categoría. */
export const getBudgets = cache(async (month: string): Promise<BudgetView[]> => {
  const { supabase } = await db();
  const [{ data, error }, categories, movements] = await Promise.all([
    supabase.from("budgets").select("*").eq("month", month),
    getCategories("expense"),
    getReportMovements(month),
  ]);
  if (error) throw error;
  const inMonth = movements.filter((m) => m.occurred_on >= month && m.occurred_on <= endOfMonth(month));
  const spentBy = new Map(expensesByCategory(inMonth, "HNL").items.map((i) => [i.id, i.cents]));
  const catById = new Map(categories.map((c) => [c.id, c]));
  return (data ?? [])
    .flatMap((b) => {
      const c = catById.get(b.category_id);
      if (!c) return [];
      const limit = Number(b.limit_cents);
      const spent = spentBy.get(c.id) ?? 0;
      return [
        {
          id: b.id,
          categoryId: c.id,
          name: c.name,
          icon: c.icon,
          color: c.color,
          limit,
          spent,
          percent: usedPercent(spent, limit),
          state: budgetState(spent, limit),
        },
      ];
    })
    .sort((a, b) => b.percent - a.percent);
});

export async function getReport(month: string) {
  const movements = await getReportMovements(month);
  const inMonth = (m: string) => movements.filter((x) => x.occurred_on >= m && x.occurred_on <= endOfMonth(m));
  const current = inMonth(month);
  const series = monthlySeries(movements, month, 6, "HNL");
  const sum = (list: ReportMovement[], kind: string, currency = "HNL") =>
    list.filter((x) => x.kind === kind && x.currency === currency).reduce((s, x) => s + x.amount_cents, 0);
  return {
    income: sum(current, "income"),
    expenses: sum(current, "expense"),
    saved: sum(current, "goal_contribution"),
    previousExpenses: series[4]?.expenses ?? 0,
    usdExpenses: sum(current, "expense", "USD"),
    byCategory: expensesByCategory(current, "HNL"),
    series,
  };
}
