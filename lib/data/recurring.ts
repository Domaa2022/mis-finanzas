import "server-only";
import { cache } from "react";
import { isDueWithinWeek, monthlyEquivalent } from "@/lib/recurring";
import type { CurrencyCode, PendingChargeRow, RecurringChargeRow } from "@/lib/supabase/database.types";
import { db, getAccounts, getProfile } from "./core";

export type RecurringItem = RecurringChargeRow & {
  account: { id: string; name: string; currency: CurrencyCode };
};

export const getRecurring = cache(async (): Promise<RecurringItem[]> => {
  const { supabase } = await db();
  const [{ data, error }, accounts] = await Promise.all([
    supabase.from("recurring_charges").select("*").order("next_charge_on"),
    getAccounts(true),
  ]);
  if (error) throw error;
  const byId = new Map(accounts.map((a) => [a.id, a]));
  return (data ?? []).flatMap((r) => {
    const a = byId.get(r.account_id);
    if (!a) return [];
    return [{ ...r, amount_cents: Number(r.amount_cents), account: { id: a.id, name: a.name, currency: a.currency } }];
  });
});

export type PendingItem = PendingChargeRow & { charge: RecurringItem };

export const getPendingCharges = cache(async (): Promise<PendingItem[]> => {
  const { supabase } = await db();
  const [{ data, error }, charges] = await Promise.all([
    supabase.from("pending_charges").select("*").eq("status", "pending").order("due_on"),
    getRecurring(),
  ]);
  if (error) throw error;
  const byId = new Map(charges.map((c) => [c.id, c]));
  return (data ?? []).flatMap((p) => {
    const charge = byId.get(p.recurring_id);
    return charge ? [{ ...p, amount_cents: Number(p.amount_cents), charge }] : [];
  });
});

export type RecurringSummary = {
  monthly: Record<CurrencyCode, number>;
  subscriptionsMonthly: Record<CurrencyCode, number>;
  fixedMonthly: Record<CurrencyCode, number>;
  activeCount: number;
  dueSoon: RecurringItem[];
  dueSoonTotal: Record<CurrencyCode, number>;
};

export function summarize(items: RecurringItem[], today: string): RecurringSummary {
  const zero = () => ({ HNL: 0, USD: 0 });
  const s: RecurringSummary = {
    monthly: zero(),
    subscriptionsMonthly: zero(),
    fixedMonthly: zero(),
    activeCount: 0,
    dueSoon: [],
    dueSoonTotal: zero(),
  };
  for (const r of items) {
    if (!r.active) continue;
    const m = monthlyEquivalent(r.frequency, r.amount_cents);
    const c = r.account.currency;
    s.monthly[c] += m;
    (r.kind === "subscription" ? s.subscriptionsMonthly : s.fixedMonthly)[c] += m;
    s.activeCount += 1;
    if (isDueWithinWeek(r.next_charge_on, today)) {
      s.dueSoon.push(r);
      s.dueSoonTotal[c] += r.amount_cents;
    }
  }
  return s;
}

/** "2 cobros esta semana" para el acceso rápido de Inicio. */
export async function getRecurringSubtitle(): Promise<string> {
  const [items, pending, { today }] = await Promise.all([getRecurring(), getPendingCharges(), getProfile()]);
  if (pending.length > 0) return pending.length === 1 ? "1 cobro por confirmar" : `${pending.length} cobros por confirmar`;
  const n = summarize(items, today).dueSoon.length;
  if (items.length === 0) return "Suscripciones y pagos";
  if (n === 0) return "Sin cobros esta semana";
  return n === 1 ? "1 cobro esta semana" : `${n} cobros esta semana`;
}
