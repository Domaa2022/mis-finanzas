import type { CurrencyCode } from "@/lib/supabase/database.types";

type Pairable = { id: string; paired_account_id: string | null };

/** Una cuenta tal como se muestra: la tarjeta bimoneda junta su cuenta en la otra moneda. */
export type AccountGroup<T> = { main: T; other: T | null };

/**
 * Junta cada tarjeta bimoneda con su cuenta en la otra moneda, en el orden de `accounts`.
 * Si la principal no está en la lista (p. ej. está archivada), la otra se muestra sola.
 */
export function groupPairedAccounts<T extends Pairable>(accounts: readonly T[]): AccountGroup<T>[] {
  const ids = new Set(accounts.map((a) => a.id));
  const otherOf = new Map<string, T>();
  for (const a of accounts) {
    if (a.paired_account_id && ids.has(a.paired_account_id)) otherOf.set(a.paired_account_id, a);
  }
  return accounts
    .filter((a) => !(a.paired_account_id && ids.has(a.paired_account_id)))
    .map((main) => ({ main, other: otherOf.get(main.id) ?? null }));
}

/** Ids de la cuenta y, si es una tarjeta bimoneda, de su cuenta en la otra moneda. */
export function accountIdsFor<T extends Pairable>(accounts: readonly T[], id: string): string[] {
  const pair = accounts.find((a) => a.paired_account_id === id);
  return pair ? [id, pair.id] : [id];
}

export function otherCurrency(currency: CurrencyCode): CurrencyCode {
  return currency === "HNL" ? "USD" : "HNL";
}
