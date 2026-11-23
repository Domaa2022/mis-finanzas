/**
 * Cálculos de presupuestos y reportes (reglas 1, 9 y 10).
 * Funciones puras: reciben los movimientos ya consultados.
 */
import { z } from "zod";
import { addMonths, startOfMonth, type ISODate } from "@/lib/dates";
import type { CurrencyCode, TransactionKind } from "@/lib/supabase/database.types";

export type BudgetState = "ok" | "near" | "over";

/**
 * Regla 9: menos del 80 % "Vas bien"; del 80 % al 100 % "Cerca del límite";
 * más del 100 % "Te pasaste del límite".
 */
export function budgetState(spentCents: number, limitCents: number): BudgetState {
  if (limitCents <= 0) return "ok";
  if (spentCents > limitCents) return "over";
  if (spentCents * 100 >= limitCents * 80) return "near";
  return "ok";
}

export const BUDGET_STATE_LABEL: Record<BudgetState, string> = {
  ok: "Vas bien",
  near: "Cerca del límite",
  over: "Te pasaste del límite",
};

/** Porcentaje usado, redondeado hacia abajo (99.9 % no se muestra como 100 %). */
export function usedPercent(spentCents: number, limitCents: number): number {
  if (limitCents <= 0) return 0;
  return Math.floor((spentCents * 100) / limitCents);
}

export type ReportMovement = {
  kind: TransactionKind;
  amount_cents: number;
  occurred_on: ISODate;
  currency: CurrencyCode;
  category: { id: string; name: string; color: string } | null;
};

/** Gastos por categoría en una moneda (solo `expense`: las transferencias no cuentan, regla 1). */
export function expensesByCategory(movements: readonly ReportMovement[], currency: CurrencyCode = "HNL") {
  const map = new Map<string, { id: string; name: string; color: string; cents: number }>();
  let total = 0;
  for (const m of movements) {
    if (m.kind !== "expense" || m.currency !== currency) continue;
    const key = m.category?.id ?? "none";
    const entry = map.get(key) ?? {
      id: key,
      name: m.category?.name ?? "Sin categoría",
      color: m.category?.color ?? "#71717A",
      cents: 0,
    };
    entry.cents += m.amount_cents;
    map.set(key, entry);
    total += m.amount_cents;
  }
  const items = [...map.values()].sort((a, b) => b.cents - a.cents);
  return {
    total,
    items: items.map((i) => ({ ...i, percent: total > 0 ? Math.round((i.cents * 100) / total) : 0 })),
  };
}

export type MonthPoint = { month: ISODate; expenses: number; income: number };

/** Gastos e ingresos de los últimos `count` meses hasta `month` (incluido), en una moneda. */
export function monthlySeries(
  movements: readonly ReportMovement[],
  month: ISODate,
  count = 6,
  currency: CurrencyCode = "HNL",
): MonthPoint[] {
  const first = addMonths(startOfMonth(month), -(count - 1));
  const points: MonthPoint[] = Array.from({ length: count }, (_, i) => ({
    month: addMonths(first, i),
    expenses: 0,
    income: 0,
  }));
  const index = new Map(points.map((p, i) => [p.month.slice(0, 7), i]));
  for (const m of movements) {
    if (m.currency !== currency) continue;
    const i = index.get(m.occurred_on.slice(0, 7));
    if (i === undefined) continue;
    if (m.kind === "expense") points[i].expenses += m.amount_cents;
    else if (m.kind === "income") points[i].income += m.amount_cents;
  }
  return points;
}

/** "12 % menos que en octubre" / "5 % más que en octubre" / null si no hay referencia. */
export function changeVsPrevious(current: number, previous: number): { percent: number; direction: "less" | "more" | "same" } | null {
  if (previous <= 0) return null;
  const diff = Math.round(((current - previous) * 100) / previous);
  return { percent: Math.abs(diff), direction: diff < 0 ? "less" : diff > 0 ? "more" : "same" };
}

/** Escapa un valor para CSV (RFC 4180). */
function csvCell(value: string): string {
  // Evita que hojas de cálculo interpreten fórmulas (=, +, -, @) en texto libre.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export type CsvRow = {
  date: string;
  kind: "expense" | "income";
  category: string;
  account: string;
  currency: CurrencyCode;
  amount_cents: number;
  note: string;
};

/** CSV de movimientos (con BOM para que Excel lea bien los acentos). */
export function toCsv(rows: readonly CsvRow[]): string {
  const header = ["Fecha", "Tipo", "Categoría", "Cuenta", "Moneda", "Monto", "Nota"];
  const lines = rows.map((r) =>
    [
      r.date,
      r.kind === "expense" ? "Gasto" : "Ingreso",
      csvCell(r.category),
      csvCell(r.account),
      r.currency,
      ((r.kind === "expense" ? -1 : 1) * r.amount_cents / 100).toFixed(2),
      csvCell(r.note),
    ].join(","),
  );
  return "﻿" + [header.join(","), ...lines].join("\r\n") + "\r\n";
}

export const budgetSchema = z.object({
  categoryId: z.uuid("Elige una categoría"),
  limit: z.number({ error: "Escribe el límite" }).int().positive("El límite debe ser mayor que cero"),
  month: z.string().regex(/^\d{4}-\d{2}-01$/, "Mes inválido"),
});
export type BudgetInput = z.infer<typeof budgetSchema>;
