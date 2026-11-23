import "server-only";
import { cache } from "react";
import type { CurrencyCode, SavingsGoalRow, SavingsScheduleRow } from "@/lib/supabase/database.types";
import { db, getAccounts, getProfile } from "./core";

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
  /** Meta o cuenta a la que va el ahorro. */
  destination: { kind: "goal" | "account"; name: string; currency: CurrencyCode };
  account: { id: string; name: string };
  /** Ya pasó la fecha del aporte y está esperando que entre el ingreso. */
  waiting: boolean;
};

export const getSchedules = cache(async (): Promise<ScheduleItem[]> => {
  const { supabase } = await db();
  const [{ data, error }, goals, accounts, { today }] = await Promise.all([
    supabase.from("savings_schedules").select("*").order("created_at"),
    getGoals(true),
    getAccounts(true),
    getProfile(),
  ]);
  if (error) throw error;
  const goalById = new Map(goals.map((g) => [g.id, g]));
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  return (data ?? []).flatMap((s) => {
    const target = s.goal_id ? goalById.get(s.goal_id) : s.to_account_id ? accountById.get(s.to_account_id) : undefined;
    const account = accountById.get(s.account_id);
    if (!target || !account) return [];
    return [
      {
        ...s,
        amount_cents: s.amount_cents === null ? null : Number(s.amount_cents),
        percent: s.percent === null ? null : Number(s.percent),
        destination: { kind: s.goal_id ? ("goal" as const) : ("account" as const), name: target.name, currency: target.currency },
        account: { id: account.id, name: account.name },
        waiting: s.active && s.wait_for_income && s.next_run_on <= today,
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
