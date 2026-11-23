"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { accountSchema, bankNameFrom, initialBalanceFrom, type AccountInput } from "@/lib/accounts/schema";
import { db } from "@/lib/data/core";
import { dbErrorMessage, fail, INVALID_FORM, type ActionResult } from "./result";

function toRow(input: AccountInput) {
  return {
    type: input.type,
    name: input.name,
    bank_name: bankNameFrom(input),
    currency: input.currency,
    color: input.color,
    include_in_total: input.includeInTotal,
    initial_balance_cents: initialBalanceFrom(input.type, input.balance),
  };
}

export async function createAccount(input: AccountInput): Promise<ActionResult<{ id: string }>> {
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) return fail(INVALID_FORM);

  const { supabase } = await db();
  const { data, error } = await supabase.from("accounts").insert(toRow(parsed.data)).select("id").single();
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true, data: { id: data.id } };
}

/**
 * Edita una cuenta. El "saldo actual" del formulario es el saldo de hoy:
 * se recalcula el saldo inicial para que, sumando los movimientos, dé esa cifra.
 */
export async function updateAccount(id: string, input: AccountInput): Promise<ActionResult> {
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success || !z.uuid().safeParse(id).success) return fail(INVALID_FORM);

  const { supabase } = await db();
  const { data: current, error: readError } = await supabase
    .from("account_balances")
    .select("balance_cents")
    .eq("account_id", id)
    .maybeSingle();
  const { data: account } = await supabase.from("accounts").select("initial_balance_cents, currency").eq("id", id).maybeSingle();
  if (readError || !current || !account) return fail("No encontramos esa cuenta.");

  const row = toRow(parsed.data);
  const movementsNet = Number(current.balance_cents) - Number(account.initial_balance_cents);
  row.initial_balance_cents = row.initial_balance_cents - movementsNet;

  if (account.currency !== row.currency) {
    const { count } = await supabase.from("transactions").select("id", { count: "exact", head: true }).eq("account_id", id);
    if ((count ?? 0) > 0) {
      return fail("No puedes cambiar la moneda de una cuenta que ya tiene movimientos.", {
        currency: "La cuenta ya tiene movimientos",
      });
    }
  }

  const { error } = await supabase.from("accounts").update(row).eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true, data: undefined };
}

export async function setAccountArchived(id: string, archived: boolean): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return fail(INVALID_FORM);
  const { supabase } = await db();
  const { error } = await supabase
    .from("accounts")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true, data: undefined };
}
