import "server-only";
import { monthTotals, type MonthTotals } from "@/lib/balances";
import { endOfMonth, startOfMonth } from "@/lib/dates";
import type { CurrencyCode, TransactionKind } from "@/lib/supabase/database.types";
import { db } from "./core";

export type TransactionListItem = {
  id: string;
  kind: TransactionKind;
  amount_cents: number;
  occurred_on: string;
  note: string | null;
  transfer_id: string | null;
  goal_id: string | null;
  recurring_id: string | null;
  account: { id: string; name: string; currency: CurrencyCode; color: string };
  category: { id: string; name: string; icon: string; color: string } | null;
  /** Otra cuenta de la transferencia o nombre de la meta del aporte. */
  counterpart: string | null;
};

const LIST_COLUMNS =
  "id, kind, amount_cents, occurred_on, note, transfer_id, goal_id, recurring_id, account:accounts!inner(id, name, currency, color), category:categories(id, name, icon, color)";

type Filters = { accountId?: string | null; from?: string; to?: string; limit?: number; kinds?: TransactionKind[] };

export async function getTransactions({ accountId, from, to, limit, kinds }: Filters = {}): Promise<TransactionListItem[]> {
  const { supabase } = await db();
  let query = supabase
    .from("transactions")
    .select(LIST_COLUMNS)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (accountId) query = query.eq("account_id", accountId);
  if (from) query = query.gte("occurred_on", from);
  if (to) query = query.lte("occurred_on", to);
  if (kinds) query = query.in("kind", kinds);
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((t) => ({
    ...(t as unknown as Omit<TransactionListItem, "counterpart">),
    amount_cents: Number(t.amount_cents),
    counterpart: null,
  }));
}

/** Totales del mes de `month` (cualquier fecha dentro del mes). Excluye transferencias (regla 1). */
export async function getMonthTotals(month: string, accountId?: string | null): Promise<MonthTotals> {
  const items = await getTransactions({
    accountId,
    from: startOfMonth(month),
    to: endOfMonth(month),
    kinds: ["expense", "income", "goal_contribution"],
  });
  return monthTotals(items.map((t) => ({ kind: t.kind, amount_cents: t.amount_cents, currency: t.account.currency })));
}

/** Cuenta del último gasto registrado, para preseleccionarla en "Registrar gasto". */
export async function getLastUsedAccountId(kind: "expense" | "income" = "expense"): Promise<string | null> {
  const { supabase } = await db();
  const { data } = await supabase
    .from("transactions")
    .select("account_id, accounts!inner(archived_at)")
    .eq("kind", kind)
    .is("accounts.archived_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.account_id ?? null;
}
