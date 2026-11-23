"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { otherCurrency } from "@/lib/accounts/cards";
import { accountSchema, bankNameFrom, initialBalanceFrom, isDualCard, type AccountInput } from "@/lib/accounts/schema";
import { db } from "@/lib/data/core";
import { dbErrorMessage, fail, INVALID_FORM, type ActionResult } from "./result";

type Supabase = Awaited<ReturnType<typeof db>>["supabase"];

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

/** Cuenta en la otra moneda de una tarjeta bimoneda: mismos datos, la otra moneda y su propia deuda. */
function toOtherRow(input: AccountInput, mainId: string) {
  return {
    ...toRow(input),
    currency: otherCurrency(input.currency),
    initial_balance_cents: initialBalanceFrom("credit_card", input.otherBalance),
    paired_account_id: mainId,
  };
}

export async function createAccount(input: AccountInput): Promise<ActionResult<{ id: string }>> {
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) return fail(INVALID_FORM);

  const { supabase } = await db();
  const id = crypto.randomUUID();
  // Una sola instrucción: si falla la cuenta en la otra moneda, no se crea ninguna.
  const rows = [{ ...toRow(parsed.data), id }, ...(isDualCard(parsed.data) ? [toOtherRow(parsed.data, id)] : [])];
  const { error } = await supabase.from("accounts").insert(rows);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true, data: { id } };
}

/**
 * Saldo inicial que hace que, sumando los movimientos ya registrados, el saldo de hoy sea `todayCents`.
 * El "saldo actual" del formulario es el de hoy, no el inicial.
 */
async function initialFor(supabase: Supabase, id: string, todayCents: number): Promise<number | null> {
  const [{ data: current }, { data: account }] = await Promise.all([
    supabase.from("account_balances").select("balance_cents").eq("account_id", id).maybeSingle(),
    supabase.from("accounts").select("initial_balance_cents").eq("id", id).maybeSingle(),
  ]);
  if (!current || !account) return null;
  const movementsNet = Number(current.balance_cents) - Number(account.initial_balance_cents);
  return todayCents - movementsNet;
}

/** Edita una cuenta y, si es tarjeta, agrega, actualiza o quita su deuda en la otra moneda. */
export async function updateAccount(id: string, input: AccountInput): Promise<ActionResult> {
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success || !z.uuid().safeParse(id).success) return fail(INVALID_FORM);
  const values = parsed.data;

  const { supabase } = await db();
  const [{ data: account }, { data: pair }] = await Promise.all([
    supabase.from("accounts").select("currency").eq("id", id).maybeSingle(),
    supabase.from("accounts").select("id").eq("paired_account_id", id).maybeSingle(),
  ]);
  if (!account) return fail("No encontramos esa cuenta.");

  const row = toRow(values);
  const initial = await initialFor(supabase, id, row.initial_balance_cents);
  if (initial === null) return fail("No encontramos esa cuenta.");
  row.initial_balance_cents = initial;

  if (account.currency !== row.currency) {
    if (pair && isDualCard(values)) {
      return fail("Una tarjeta con deuda en dos monedas no puede cambiar su moneda principal.", {
        currency: "Quita primero la deuda en la otra moneda",
      });
    }
    const { count } = await supabase.from("transactions").select("id", { count: "exact", head: true }).eq("account_id", id);
    if ((count ?? 0) > 0) {
      return fail("No puedes cambiar la moneda de una cuenta que ya tiene movimientos.", {
        currency: "La cuenta ya tiene movimientos",
      });
    }
  }

  // Sin deuda en la otra moneda: esa cuenta se separa y se archiva (conserva sus movimientos).
  if (pair && !isDualCard(values)) {
    const { error } = await supabase
      .from("accounts")
      .update({ paired_account_id: null, archived_at: new Date().toISOString() })
      .eq("id", pair.id);
    if (error) return fail(dbErrorMessage(error));
  }

  const { error } = await supabase.from("accounts").update(row).eq("id", id);
  if (error) return fail(dbErrorMessage(error));

  if (isDualCard(values)) {
    const other = toOtherRow(values, id);
    if (pair) {
      const otherInitial = await initialFor(supabase, pair.id, other.initial_balance_cents);
      if (otherInitial === null) return fail("No encontramos la deuda en la otra moneda.");
      const { error: pairError } = await supabase
        .from("accounts")
        .update({ ...other, initial_balance_cents: otherInitial })
        .eq("id", pair.id);
      if (pairError) return fail(dbErrorMessage(pairError));
    } else {
      const { error: pairError } = await supabase.from("accounts").insert(other);
      if (pairError) return fail(dbErrorMessage(pairError));
    }
  }

  refresh();
  return { ok: true, data: undefined };
}

/** Archiva o restaura una cuenta junto con su deuda en la otra moneda, si es tarjeta bimoneda. */
export async function setAccountArchived(id: string, archived: boolean): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return fail(INVALID_FORM);
  const { supabase } = await db();
  const { error } = await supabase
    .from("accounts")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .or(`id.eq.${id},paired_account_id.eq.${id}`);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true, data: undefined };
}
