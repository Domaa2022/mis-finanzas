"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/data/core";
import { recurringSchema, type RecurringInput } from "@/lib/recurring";
import { dbErrorMessage, fail, INVALID_FORM, type ActionResult } from "./result";

const isId = (id: string) => z.uuid().safeParse(id).success;

async function toRow(input: RecurringInput) {
  const { supabase } = await db();
  const [{ data: category }, { data: account }] = await Promise.all([
    supabase.from("categories").select("icon, color, kind").eq("id", input.categoryId).maybeSingle(),
    supabase.from("accounts").select("archived_at").eq("id", input.accountId).maybeSingle(),
  ]);
  if (!category || category.kind !== "expense") return { error: "Elige una categoría de gasto." } as const;
  if (!account || account.archived_at) return { error: "Elige una cuenta activa." } as const;
  return {
    row: {
      kind: input.kind,
      name: input.name,
      icon: category.icon,
      color: category.color,
      account_id: input.accountId,
      category_id: input.categoryId,
      amount_cents: input.amount,
      is_variable: input.isVariable,
      frequency: input.frequency,
      day_rule: input.dayRule,
      remind_days_before: input.remindDaysBefore,
      // Con monto variable siempre se pregunta el monto real (regla 8).
      auto_register: input.isVariable ? false : input.autoRegister,
    },
  } as const;
}

export async function createRecurring(input: RecurringInput): Promise<ActionResult<{ id: string }>> {
  const parsed = recurringSchema.safeParse(input);
  if (!parsed.success) return fail(INVALID_FORM);
  const built = await toRow(parsed.data);
  if ("error" in built) return fail(built.error ?? INVALID_FORM);
  const { supabase } = await db();
  const { data, error } = await supabase.from("recurring_charges").insert(built.row).select("id").single();
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true, data: { id: data.id } };
}

export async function updateRecurring(id: string, input: RecurringInput): Promise<ActionResult> {
  const parsed = recurringSchema.safeParse(input);
  if (!parsed.success || !isId(id)) return fail(INVALID_FORM);
  const built = await toRow(parsed.data);
  if ("error" in built) return fail(built.error ?? INVALID_FORM);
  const { supabase } = await db();
  const { error } = await supabase.from("recurring_charges").update(built.row).eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true, data: undefined };
}

export async function setRecurringActive(id: string, active: boolean): Promise<ActionResult> {
  if (!isId(id)) return fail(INVALID_FORM);
  const { supabase } = await db();
  const { error } = await supabase.from("recurring_charges").update({ active }).eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true, data: undefined };
}

export async function deleteRecurring(id: string): Promise<ActionResult> {
  if (!isId(id)) return fail(INVALID_FORM);
  const { supabase } = await db();
  const { error } = await supabase.from("recurring_charges").delete().eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true, data: undefined };
}

export async function confirmPending(id: string, amountCents: number | null): Promise<ActionResult> {
  if (!isId(id) || (amountCents !== null && (!Number.isInteger(amountCents) || amountCents <= 0))) return fail(INVALID_FORM);
  const { supabase } = await db();
  const { error } = await supabase.rpc("confirm_pending_charge", { p_pending: id, p_amount_cents: amountCents });
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true, data: undefined };
}

export async function dismissPending(id: string): Promise<ActionResult> {
  if (!isId(id)) return fail(INVALID_FORM);
  const { supabase } = await db();
  const { error } = await supabase.from("pending_charges").update({ status: "dismissed" }).eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true, data: undefined };
}
