import "server-only";
import { cache } from "react";
import { DEFAULT_TIMEZONE, todayIn } from "@/lib/dates";
import type { AccountRow, CategoryKind, CategoryRow, CurrencyCode } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "./user";

/**
 * Lecturas compartidas por varias pantallas. Todas leen la sesión: úsalas dentro de <Suspense>.
 * `cache` evita repetir la misma consulta dentro de una petición.
 */

/** Cliente de Supabase con la sesión ya verificada (redirige a /login si no hay). */
export const db = cache(async () => {
  const user = await getCurrentUser();
  const supabase = await createClient();
  return { supabase, user };
});

export type Profile = { displayName: string; timezone: string; today: string };

export const getProfile = cache(async (): Promise<Profile> => {
  const { supabase, user } = await db();
  const { data } = await supabase.from("profiles").select("display_name, timezone").eq("id", user.id).maybeSingle();
  const timezone = data?.timezone ?? DEFAULT_TIMEZONE;
  const displayName = (data?.display_name ?? user.name).split(/\s+/)[0] || user.name;
  return { displayName, timezone, today: todayIn(timezone) };
});

export type AccountWithBalance = AccountRow & { balance_cents: number };

/** Cuentas con su saldo (vista account_balances). Por defecto, solo las activas. */
export const getAccounts = cache(async (includeArchived = false): Promise<AccountWithBalance[]> => {
  const { supabase } = await db();
  let query = supabase.from("accounts").select("*").order("created_at");
  if (!includeArchived) query = query.is("archived_at", null);
  const [{ data: accounts, error }, { data: balances, error: balError }] = await Promise.all([
    query,
    supabase.from("account_balances").select("account_id, balance_cents"),
  ]);
  if (error) throw error;
  if (balError) throw balError;
  const byId = new Map((balances ?? []).map((b) => [b.account_id, Number(b.balance_cents)]));
  return (accounts ?? []).map((a) => ({
    ...a,
    initial_balance_cents: Number(a.initial_balance_cents),
    balance_cents: byId.get(a.id) ?? Number(a.initial_balance_cents),
  }));
});

export const getCategories = cache(async (kind?: CategoryKind): Promise<CategoryRow[]> => {
  const { supabase } = await db();
  let query = supabase.from("categories").select("*").order("created_at");
  if (kind) query = query.eq("kind", kind);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
});

export function currencyOf(accounts: readonly { id: string; currency: CurrencyCode }[], id: string): CurrencyCode {
  return accounts.find((a) => a.id === id)?.currency ?? "HNL";
}
