import { describe, expect, it } from "vitest";
import { convertCents, parseRate, transferSchema } from "./transfers";

describe("convertCents (regla 2)", () => {
  it("no convierte entre la misma moneda", () => {
    expect(convertCents(12345, "HNL", "HNL", null)).toBe(12345);
  });

  it("de lempiras a dólares divide entre la tasa", () => {
    // L 2,465.00 a 24.65 L/$ = $ 100.00
    expect(convertCents(246500, "HNL", "USD", 24.65)).toBe(10000);
  });

  it("de dólares a lempiras multiplica por la tasa", () => {
    expect(convertCents(10000, "USD", "HNL", 24.65)).toBe(246500);
  });

  it("redondea al centavo", () => {
    // L 1,000.00 / 24.6512 = $ 40.5660… → 4057 centavos
    expect(convertCents(100000, "HNL", "USD", 24.6512)).toBe(4057);
  });

  it("exige la tasa cuando las monedas difieren", () => {
    expect(() => convertCents(100, "HNL", "USD", null)).toThrow();
  });
});

describe("parseRate", () => {
  it("acepta hasta 4 decimales", () => {
    expect(parseRate("24.65")).toBe(24.65);
    expect(parseRate("24,6512")).toBe(24.6512);
    expect(parseRate("24.65123")).toBeNull();
    expect(parseRate("0")).toBeNull();
    expect(parseRate("abc")).toBeNull();
  });
});

describe("transferSchema", () => {
  const base = {
    fromAccountId: "11111111-1111-4111-8111-111111111111",
    toAccountId: "22222222-2222-4222-8222-222222222222",
    amount: 100,
    exchangeRate: null,
    occurredOn: "2026-11-22",
    note: "",
  };

  it("acepta una transferencia válida", () => {
    expect(transferSchema.safeParse(base).success).toBe(true);
  });

  it("rechaza la misma cuenta en origen y destino", () => {
    const r = transferSchema.safeParse({ ...base, toAccountId: base.fromAccountId });
    expect(r.success).toBe(false);
  });
});
