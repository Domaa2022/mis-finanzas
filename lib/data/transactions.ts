import "server-only";
import { accountIdsFor } from "@/lib/accounts/cards";
import { monthTotals, type MonthTotals } from "@/lib/balances";
import { endOfMonth, startOfMonth } from "@/lib/dates";
import type { CurrencyCode, TransactionKind } from "@/lib/supabase/database.types";
import { db, getAccounts } from "./core";

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

/** `accountId`: en una tarjeta bimoneda incluye también los movimientos de su deuda en la otra moneda. */
type Filters = { accountId?: string | null; from?: string; to?: string; limit?: number; kinds?: TransactionKind[] };

export async function getTransactions({ accountId, from, to, limit, kinds }: Filters = {}): Promise<TransactionListItem[]> {
  const { supabase } = await db();
  let query = supabase
    .from("transactions")
    .select(LIST_COLUMNS)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (accountId) query = query.in("account_id", accountIdsFor(await getAccounts(true), accountId));
  if (from) query = query.gte("occurred_on", from);
  if (to) query = query.lte("occurred_on", to);
  if (kinds) query = query.in("kind", kinds);
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as unknown as Omit<TransactionListItem, "counterpart">[];
  const counterparts = await resolveCounterparts(rows);
  return rows.map((t) => ({
    ...t,
    amount_cents: Number(t.amount_cents),
    counterpart: counterparts.get(t.id) ?? null,
  }));
}

/** Nombre de la otra cuenta en transferencias y de la meta en aportes. */
async function resolveCounterparts(rows: Omit<TransactionListItem, "counterpart">[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const transferIds = [...new Set(rows.map((r) => r.transfer_id).filter((id): id is string => Boolean(id)))];
  const goalIds = [...new Set(rows.map((r) => r.goal_id).filter((id): id is string => Boolean(id)))];
  if (transferIds.length === 0 && goalIds.length === 0) return result;

  const { supabase } = await db();
  const [accounts, transfers, goals] = await Promise.all([
    getAccounts(true),
    transferIds.length
      ? supabase.from("transfers").select("id, from_account_id, to_account_id").in("id", transferIds)
      : Promise.resolve({ data: [] as { id: string; from_account_id: string; to_account_id: string }[] }),
    goalIds.length
      ? supabase.from("savings_goals").select("id, name").in("id", goalIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const accountName = new Map(accounts.map((a) => [a.id, a.name]));
  const transferById = new Map((transfers.data ?? []).map((t) => [t.id, t]));
  const goalName = new Map((goals.data ?? []).map((g) => [g.id, g.name]));

  for (const r of rows) {
    if (r.transfer_id) {
      const t = transferById.get(r.transfer_id);
      const other = t && (r.kind === "transfer_out" ? t.to_account_id : t.from_account_id);
      const name = other && accountName.get(other);
      if (name) result.set(r.id, name);
    } else if (r.goal_id) {
      const name = goalName.get(r.goal_id);
      if (name) result.set(r.id, name);
    }
  }
  return result;
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
