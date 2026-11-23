"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/data/core";
import { addMonths } from "@/lib/dates";
import { budgetSchema, type BudgetInput } from "@/lib/reports";
import { dbErrorMessage, fail, INVALID_FORM, type ActionResult } from "./result";

const isId = (id: string) => z.uuid().safeParse(id).success;
const isMonth = (m: string) => /^\d{4}-\d{2}-01$/.test(m);

/** Crea el presupuesto o actualiza el límite si ya existía para esa categoría y mes. */
export async function saveBudget(input: BudgetInput): Promise<ActionResult> {
  const parsed = budgetSchema.safeParse(input);
  if (!parsed.success) return fail(INVALID_FORM);
  const v = parsed.data;
  const { supabase, user } = await db();
  const { error } = await supabase
    .from("budgets")
    .upsert(
      { user_id: user.id, category_id: v.categoryId, month: v.month, limit_cents: v.limit },
      { onConflict: "user_id,category_id,month" },
    );
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true, data: undefined };
}

export async function deleteBudget(id: string): Promise<ActionResult> {
  if (!isId(id)) return fail(INVALID_FORM);
  const { supabase } = await db();
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true, data: undefined };
}

/** Copia los presupuestos del mes anterior al mes indicado (sin pisar los que ya existen). */
export async function copyPreviousBudgets(month: string): Promise<ActionResult<{ copied: number }>> {
  if (!isMonth(month)) return fail(INVALID_FORM);
  const { supabase, user } = await db();
  const { data: previous, error } = await supabase
    .from("budgets")
    .select("category_id, limit_cents")
    .eq("month", addMonths(month, -1));
  if (error) return fail(dbErrorMessage(error));
  if (!previous?.length) return fail("El mes anterior no tiene presupuestos.");
  const { data, error: insertError } = await supabase
    .from("budgets")
    .upsert(
      previous.map((b) => ({ user_id: user.id, category_id: b.category_id, month, limit_cents: b.limit_cents })),
      { onConflict: "user_id,category_id,month", ignoreDuplicates: true },
    )
    .select("id");
  if (insertError) return fail(dbErrorMessage(insertError));
  refresh();
  return { ok: true, data: { copied: data?.length ?? 0 } };
}
