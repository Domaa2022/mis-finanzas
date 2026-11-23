"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/data/core";
import { transactionSchema, type TransactionInput } from "@/lib/transactions/schema";
import { dbErrorMessage, fail, INVALID_FORM, type ActionResult } from "./result";

export async function createTransaction(input: TransactionInput): Promise<ActionResult<{ id: string }>> {
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) return fail(INVALID_FORM);
  const v = parsed.data;

  const { supabase } = await db();
  const { data: category } = await supabase.from("categories").select("kind").eq("id", v.categoryId).maybeSingle();
  if (!category || category.kind !== v.kind) return fail("Elige una categoría válida.", { categoryId: "Elige una categoría" });

  const { data: account } = await supabase.from("accounts").select("archived_at").eq("id", v.accountId).maybeSingle();
  if (!account || account.archived_at) return fail("Elige una cuenta activa.", { accountId: "Elige una cuenta" });

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      kind: v.kind,
      amount_cents: v.amount,
      category_id: v.categoryId,
      account_id: v.accountId,
      occurred_on: v.occurredOn,
      note: v.note || null,
    })
    .select("id")
    .single();
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true, data: { id: data.id } };
}

/**
 * Borra un gasto, ingreso o aporte a meta (el aporte devuelve el dinero a la
 * cuenta). Las transferencias se borran completas con deleteTransfer.
 */
export async function deleteTransaction(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return fail(INVALID_FORM);
  const { supabase } = await db();
  const { error } = await supabase.from("transactions").delete().eq("id", id).in("kind", ["expense", "income", "goal_contribution"]);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true, data: undefined };
}
