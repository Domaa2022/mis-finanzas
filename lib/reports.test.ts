import { describe, expect, it } from "vitest";
import {
  budgetState,
  changeVsPrevious,
  expensesByCategory,
  monthlySeries,
  toCsv,
  usedPercent,
  type ReportMovement,
} from "./reports";

describe("budgetState (regla 9)", () => {
  it("menos del 80 % es 'Vas bien'", () => {
    expect(budgetState(7999, 10000)).toBe("ok");
    expect(budgetState(0, 10000)).toBe("ok");
  });
  it("del 80 % al 100 % es 'Cerca del límite'", () => {
    expect(budgetState(8000, 10000)).toBe("near");
    expect(budgetState(10000, 10000)).toBe("near");
  });
  it("más del 100 % es 'Te pasaste del límite'", () => {
    expect(budgetState(10001, 10000)).toBe("over");
  });
  it("porcentaje usado sin redondear hacia arriba", () => {
    expect(usedPercent(9999, 10000)).toBe(99);
    expect(usedPercent(12000, 10000)).toBe(120);
  });
});

const cat = (id: string, name: string) => ({ id, name, color: "#0F766E" });
const movements: ReportMovement[] = [
  { kind: "expense", amount_cents: 3000, occurred_on: "2026-11-02", currency: "HNL", category: cat("c1", "Comida") },
  { kind: "expense", amount_cents: 1000, occurred_on: "2026-11-05", currency: "HNL", category: cat("c2", "Transporte") },
  { kind: "expense", amount_cents: 1000, occurred_on: "2026-11-06", currency: "HNL", category: cat("c1", "Comida") },
  { kind: "transfer_out", amount_cents: 99999, occurred_on: "2026-11-07", currency: "HNL", category: null },
  { kind: "goal_contribution", amount_cents: 5000, occurred_on: "2026-11-07", currency: "HNL", category: null },
  { kind: "income", amount_cents: 50000, occurred_on: "2026-11-01", currency: "HNL", category: cat("c9", "Salario") },
  { kind: "expense", amount_cents: 700, occurred_on: "2026-11-01", currency: "USD", category: cat("c1", "Comida") },
  { kind: "expense", amount_cents: 2000, occurred_on: "2026-10-15", currency: "HNL", category: cat("c1", "Comida") },
  { kind: "expense", amount_cents: 500, occurred_on: "2026-05-31", currency: "HNL", category: cat("c1", "Comida") },
];

describe("expensesByCategory", () => {
  it("suma solo gastos de la moneda, sin transferencias ni aportes (regla 1)", () => {
    const nov = movements.filter((m) => m.occurred_on.startsWith("2026-11"));
    const r = expensesByCategory(nov);
    expect(r.total).toBe(5000);
    expect(r.items).toEqual([
      { id: "c1", name: "Comida", color: "#0F766E", cents: 4000, percent: 80 },
      { id: "c2", name: "Transporte", color: "#0F766E", cents: 1000, percent: 20 },
    ]);
  });
});

describe("monthlySeries", () => {
  it("devuelve los últimos 6 meses con el actual al final", () => {
    const s = monthlySeries(movements, "2026-11-22");
    expect(s.map((p) => p.month)).toEqual(["2026-06-01", "2026-07-01", "2026-08-01", "2026-09-01", "2026-10-01", "2026-11-01"]);
    expect(s[5]).toEqual({ month: "2026-11-01", expenses: 5000, income: 50000 });
    expect(s[4].expenses).toBe(2000);
    expect(s[0].expenses).toBe(0); // mayo queda fuera
  });

  it("los totales del reporte cuadran con los movimientos", () => {
    const s = monthlySeries(movements, "2026-11-01");
    const total = s.reduce((sum, p) => sum + p.expenses, 0);
    const expected = movements
      .filter((m) => m.kind === "expense" && m.currency === "HNL" && m.occurred_on >= "2026-06-01")
      .reduce((sum, m) => sum + m.amount_cents, 0);
    expect(total).toBe(expected);
  });
});

describe("changeVsPrevious", () => {
  it("compara con el mes anterior", () => {
    expect(changeVsPrevious(8000, 10000)).toEqual({ percent: 20, direction: "less" });
    expect(changeVsPrevious(12500, 10000)).toEqual({ percent: 25, direction: "more" });
    expect(changeVsPrevious(100, 0)).toBeNull();
  });
});

describe("toCsv", () => {
  it("genera CSV con encabezado, signos y escapes", () => {
    const csv = toCsv([
      { date: "2026-11-02", kind: "expense", category: "Comida", account: "Corriente", currency: "HNL", amount_cents: 123450, note: 'Cena, "especial"' },
      { date: "2026-11-01", kind: "income", category: "Salario", account: "Corriente", currency: "HNL", amount_cents: 5000000, note: "=SUMA(A1)" },
    ]);
    const lines = csv.replace("﻿", "").trim().split("\r\n");
    expect(csv.startsWith("﻿")).toBe(true);
    expect(lines[0]).toBe("Fecha,Tipo,Categoría,Cuenta,Moneda,Monto,Nota");
    expect(lines[1]).toBe('2026-11-02,Gasto,Comida,Corriente,HNL,-1234.50,"Cena, ""especial"""');
    expect(lines[2]).toBe("2026-11-01,Ingreso,Salario,Corriente,HNL,50000.00,'=SUMA(A1)");
  });
});
