import "server-only";
import { cache } from "react";
import type { CurrencyCode, SavingsGoalRow, SavingsScheduleRow } from "@/lib/supabase/database.types";
import { db, getAccounts } from "./core";

export type Goal = SavingsGoalRow & { saved_cents: number };

export const getGoals = cache(async (includeArchived = false): Promise<Goal[]> => {
  const { supabase } = await db();
  let query = supabase.from("savings_goals").select("*").order("created_at");
  if (!includeArchived) query = query.is("archived_at", null);
  const [{ data: goals, error }, { data: progress, error: pError }] = await Promise.all([
    query,
    supabase.from("goal_progress").select("goal_id, saved_cents"),
  ]);
  if (error) throw error;
  if (pError) throw pError;
  const saved = new Map((progress ?? []).map((p) => [p.goal_id, Number(p.saved_cents)]));
  return (goals ?? []).map((g) => ({ ...g, target_cents: Number(g.target_cents), saved_cents: saved.get(g.id) ?? 0 }));
});

export type ScheduleItem = SavingsScheduleRow & {
  goal: { id: string; name: string; currency: CurrencyCode };
  account: { id: string; name: string };
};

export const getSchedules = cache(async (): Promise<ScheduleItem[]> => {
  const { supabase } = await db();
  const [{ data, error }, goals, accounts] = await Promise.all([
    supabase.from("savings_schedules").select("*").order("created_at"),
    getGoals(true),
    getAccounts(true),
  ]);
  if (error) throw error;
  const goalById = new Map(goals.map((g) => [g.id, g]));
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  return (data ?? []).flatMap((s) => {
    const goal = goalById.get(s.goal_id);
    const account = accountById.get(s.account_id);
    if (!goal || !account) return [];
    return [
      {
        ...s,
        amount_cents: s.amount_cents === null ? null : Number(s.amount_cents),
        percent: s.percent === null ? null : Number(s.percent),
        goal: { id: goal.id, name: goal.name, currency: goal.currency },
        account: { id: account.id, name: account.name },
      },
    ];
  });
});

/** Total ahorrado en metas activas, por moneda. */
export function totalSaved(goals: Goal[]): Record<CurrencyCode, number> {
  const totals = { HNL: 0, USD: 0 };
  for (const g of goals) if (!g.archived_at) totals[g.currency] += g.saved_cents;
  return totals;
}
