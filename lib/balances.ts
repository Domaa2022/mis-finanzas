/**
 * Cálculos de saldos y totales. Reflejan la vista SQL `account_balances`
 * y las reglas 1 y 3 del plan; se usan en la interfaz y en los tests.
 */
import type { CurrencyCode, TransactionKind } from "@/lib/supabase/database.types";

export type BalanceMovement = { kind: TransactionKind; amount_cents: number };

/** Signo con que cada tipo de movimiento afecta el saldo de su cuenta. */
export function balanceSign(kind: TransactionKind): 1 | -1 {
  return kind === "income" || kind === "transfer_in" ? 1 : -1;
}

/**
 * Saldo = inicial + ingresos + transfer_in − gastos − transfer_out − goal_contribution.
 */
export function computeBalance(initialCents: number, movements: readonly BalanceMovement[]): number {
  return movements.reduce((sum, m) => sum + balanceSign(m.kind) * m.amount_cents, initialCents);
}

export type TotalsByCurrency = Record<CurrencyCode, number> & { hasUsd: boolean };

/**
 * Total de Inicio (regla 3): solo cuentas con `include_in_total` y sin archivar.
 * Lempiras y dólares se suman por separado; nunca se mezclan sin una tasa.
 */
export function totalsByCurrency(
  accounts: readonly {
    currency: CurrencyCode;
    balance_cents: number;
    include_in_total: boolean;
    archived_at?: string | null;
  }[],
): TotalsByCurrency {
  const totals: TotalsByCurrency = { HNL: 0, USD: 0, hasUsd: false };
  for (const a of accounts) {
    if (!a.include_in_total || a.archived_at) continue;
    totals[a.currency] += a.balance_cents;
    if (a.currency === "USD") totals.hasUsd = true;
  }
  return totals;
}

export type MonthMovement = { kind: TransactionKind; amount_cents: number; currency: CurrencyCode };

export type MonthTotals = {
  expenses: Record<CurrencyCode, number>;
  income: Record<CurrencyCode, number>;
  saved: Record<CurrencyCode, number>;
};

/**
 * Totales del mes (regla 1): las transferencias no son gasto ni ingreso y se excluyen.
 * Los aportes a metas cuentan como "Ahorrado", no como gasto.
 */
export function monthTotals(movements: readonly MonthMovement[]): MonthTotals {
  const totals: MonthTotals = {
    expenses: { HNL: 0, USD: 0 },
    income: { HNL: 0, USD: 0 },
    saved: { HNL: 0, USD: 0 },
  };
  for (const m of movements) {
    if (m.kind === "expense") totals.expenses[m.currency] += m.amount_cents;
    else if (m.kind === "income") totals.income[m.currency] += m.amount_cents;
    else if (m.kind === "goal_contribution") totals.saved[m.currency] += m.amount_cents;
  }
  return totals;
}

/** Tipos de movimiento que cuentan para reportes y presupuestos (regla 1). */
export const REPORTABLE_KINDS = ["expense", "income"] as const satisfies readonly TransactionKind[];

/** ¿Puede la cuenta quedar en negativo? Solo las tarjetas de crédito (regla 5). */
export function allowsNegative(type: string): boolean {
  return type === "credit_card";
}
