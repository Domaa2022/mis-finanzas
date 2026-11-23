"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/data/core";
import {
  contributionSchema,
  goalSchema,
  scheduleSchema,
  type ContributionInput,
  type GoalInput,
  type ScheduleInput,
} from "@/lib/savings/schemas";
import { dbErrorMessage, fail, INVALID_FORM, type ActionResult } from "./result";

const isId = (id: string) => z.uuid().safeParse(id).success;

export async function createGoal(input: GoalInput): Promise<ActionResult<{ id: string }>> {
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) return fail(INVALID_FORM);
  const v = parsed.data;
  const { supabase } = await db();
  const { data, error } = await supabase
    .from("savings_goals")
    .insert({
      name: v.name,
      icon: v.icon,
      color: v.color,
      target_cents: v.target,
      currency: v.currency,
      target_date: v.targetDate || null,
    })
    .select("id")
    .single();
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true, data: { id: data.id } };
}

export async function archiveGoal(id: string): Promise<ActionResult> {
  if (!isId(id)) return fail(INVALID_FORM);
  const { supabase } = await db();
  const { error: goalError } = await supabase.from("savings_goals").update({ archived_at: new Date().toISOString() }).eq("id", id);
  if (goalError) return fail(dbErrorMessage(goalError));
  await supabase.from("savings_schedules").update({ active: false }).eq("goal_id", id);
  refresh();
  return { ok: true, data: undefined };
}

export async function contribute(input: ContributionInput): Promise<ActionResult<{ id: string }>> {
  const parsed = contributionSchema.safeParse(input);
  if (!parsed.success) return fail(INVALID_FORM);
  const v = parsed.data;
  const { supabase } = await db();
  const { data, error } = await supabase.rpc("contribute_to_goal", {
    p_goal: v.goalId,
    p_account: v.accountId,
    p_amount_cents: v.amount,
    p_occurred_on: v.occurredOn,
  });
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true, data: { id: data } };
}

/** Deshace un aporte: el dinero vuelve a la cuenta. */
export async function deleteContribution(id: string): Promise<ActionResult> {
  if (!isId(id)) return fail(INVALID_FORM);
  const { supabase } = await db();
  const { error } = await supabase.from("transactions").delete().eq("id", id).eq("kind", "goal_contribution");
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true, data: undefined };
}

export async function createSchedule(input: ScheduleInput): Promise<ActionResult<{ id: string }>> {
  const parsed = scheduleSchema.safeParse(input);
  if (!parsed.success) return fail(INVALID_FORM);
  const v = parsed.data;
  const { supabase } = await db();

  const toGoal = v.destination === "goal";
  const [{ data: destination }, { data: account }] = await Promise.all([
    toGoal
      ? supabase.from("savings_goals").select("currency, archived_at").eq("id", v.goalId).maybeSingle()
      : supabase.from("accounts").select("currency, archived_at").eq("id", v.toAccountId).maybeSingle(),
    supabase.from("accounts").select("currency, archived_at").eq("id", v.accountId).maybeSingle(),
  ]);
  if (!destination || destination.archived_at) return fail(toGoal ? "Elige una meta activa." : "Elige una cuenta de ahorro activa.");
  if (!account || account.archived_at) return fail("Elige una cuenta activa.");
  if (destination.currency !== account.currency) {
    return toGoal
      ? fail("La cuenta debe estar en la misma moneda que la meta.", { accountId: "Elige una cuenta en la moneda de la meta" })
      : fail("Las dos cuentas deben ser de la misma moneda.", { accountId: "Elige una cuenta en la misma moneda" });
  }

  const { data, error } = await supabase
    .from("savings_schedules")
    .insert({
      goal_id: toGoal ? v.goalId : null,
      to_account_id: toGoal ? null : v.toAccountId,
      account_id: v.accountId,
      mode: v.mode,
      amount_cents: v.mode === "fixed" ? v.amount : null,
      percent: v.mode === "percent" ? v.percent : null,
      frequency: v.frequency,
      days: v.days,
      ends: v.ends,
      end_date: v.ends === "on_date" ? v.endDate : null,
      wait_for_income: v.waitForIncome,
    })
    .select("id")
    .single();
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true, data: { id: data.id } };
}

/** Pausa o reanuda. Al reanudar, el próximo aporte se calcula desde hoy. */
export async function setScheduleActive(id: string, active: boolean): Promise<ActionResult> {
  if (!isId(id)) return fail(INVALID_FORM);
  const { supabase } = await db();
  const { error } = await supabase.from("savings_schedules").update({ active }).eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true, data: undefined };
}

export async function deleteSchedule(id: string): Promise<ActionResult> {
  if (!isId(id)) return fail(INVALID_FORM);
  const { supabase } = await db();
  const { error } = await supabase.from("savings_schedules").delete().eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true, data: undefined };
}
