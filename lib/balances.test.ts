import { describe, expect, it } from "vitest";
import { computeBalance, monthTotals, totalsByCurrency } from "./balances";

describe("computeBalance (vista account_balances)", () => {
  it("sin movimientos es el saldo inicial", () => {
    expect(computeBalance(10_000, [])).toBe(10_000);
  });

  it("suma ingresos y transferencias recibidas; resta gastos, transferencias enviadas y aportes", () => {
    const balance = computeBalance(100_000, [
      { kind: "income", amount_cents: 50_000 },
      { kind: "transfer_in", amount_cents: 20_000 },
      { kind: "expense", amount_cents: 15_000 },
      { kind: "transfer_out", amount_cents: 30_000 },
      { kind: "goal_contribution", amount_cents: 10_000 },
    ]);
    expect(balance).toBe(100_000 + 50_000 + 20_000 - 15_000 - 30_000 - 10_000);
  });

  it("una tarjeta de crédito puede quedar en negativo (deuda)", () => {
    expect(computeBalance(-5_000, [{ kind: "expense", amount_cents: 2_500 }])).toBe(-7_500);
  });

  it("una transferencia entre dos cuentas no cambia el total", () => {
    const a = computeBalance(10_000, [{ kind: "transfer_out", amount_cents: 4_000 }]);
    const b = computeBalance(0, [{ kind: "transfer_in", amount_cents: 4_000 }]);
    expect(a + b).toBe(10_000);
  });
});

describe("totalsByCurrency (regla 3)", () => {
  const accounts = [
    { currency: "HNL" as const, balance_cents: 100_00, include_in_total: true },
    { currency: "HNL" as const, balance_cents: 50_00, include_in_total: false },
    { currency: "USD" as const, balance_cents: 20_00, include_in_total: true },
    { currency: "HNL" as const, balance_cents: 999_00, include_in_total: true, archived_at: "2026-01-01" },
  ];

  it("suma solo las cuentas incluidas y sin archivar", () => {
    const t = totalsByCurrency(accounts);
    expect(t.HNL).toBe(100_00);
  });

  it("separa lempiras y dólares", () => {
    const t = totalsByCurrency(accounts);
    expect(t.USD).toBe(20_00);
    expect(t.hasUsd).toBe(true);
  });

  it("indica cuando no hay cuentas en dólares", () => {
    expect(totalsByCurrency([accounts[0]]).hasUsd).toBe(false);
  });
});

describe("monthTotals (regla 1)", () => {
  it("excluye las transferencias de gastos e ingresos", () => {
    const t = monthTotals([
      { kind: "expense", amount_cents: 1_000, currency: "HNL" },
      { kind: "income", amount_cents: 5_000, currency: "HNL" },
      { kind: "transfer_out", amount_cents: 2_000, currency: "HNL" },
      { kind: "transfer_in", amount_cents: 2_000, currency: "HNL" },
      { kind: "goal_contribution", amount_cents: 700, currency: "HNL" },
      { kind: "expense", amount_cents: 300, currency: "USD" },
    ]);
    expect(t.expenses).toEqual({ HNL: 1_000, USD: 300 });
    expect(t.income).toEqual({ HNL: 5_000, USD: 0 });
    expect(t.saved).toEqual({ HNL: 700, USD: 0 });
  });
});
