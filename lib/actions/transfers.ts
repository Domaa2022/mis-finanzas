"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/data/core";
import { transferSchema, type TransferInput } from "@/lib/transfers";
import { dbErrorMessage, fail, INVALID_FORM, type ActionResult } from "./result";

export async function createTransfer(input: TransferInput): Promise<ActionResult<{ id: string }>> {
  const parsed = transferSchema.safeParse(input);
  if (!parsed.success) return fail(INVALID_FORM);
  const v = parsed.data;

  const { supabase } = await db();
  const { data, error } = await supabase.rpc("create_transfer", {
    p_from_account: v.fromAccountId,
    p_to_account: v.toAccountId,
    p_amount_cents: v.amount,
    p_exchange_rate: v.exchangeRate,
    p_occurred_on: v.occurredOn,
    p_note: v.note || null,
  });
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true, data: { id: data } };
}

/** Borra una transferencia completa (sus dos movimientos). */
export async function deleteTransfer(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return fail(INVALID_FORM);
  const { supabase } = await db();
  const { error } = await supabase.from("transfers").delete().eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true, data: undefined };
}
