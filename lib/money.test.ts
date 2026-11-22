import { describe, expect, it } from "vitest";
import { formatAmount, formatMoney, parseMoneyInput } from "./money";

const nb = (s: string) => s.replace(/ /g, " ");

describe("formatMoney", () => {
  it("formatea lempiras con separador de miles y dos decimales", () => {
    expect(nb(formatMoney(123450, "HNL"))).toBe("L 1,234.50");
  });

  it("formatea dólares", () => {
    expect(nb(formatMoney(123450, "USD"))).toBe("$ 1,234.50");
  });

  it("formatea cero", () => {
    expect(nb(formatMoney(0, "HNL"))).toBe("L 0.00");
  });

  it("muestra el signo menos antes del símbolo", () => {
    expect(nb(formatMoney(-5, "HNL"))).toBe("−L 0.05");
  });

  it("puede forzar el signo más", () => {
    expect(nb(formatMoney(100, "USD", { signDisplay: "always" }))).toBe("+$ 1.00");
  });

  it("usa espacio de no separación entre símbolo y monto", () => {
    expect(formatMoney(100, "HNL")).toBe("L 1.00");
  });

  it("rechaza montos que no son enteros", () => {
    expect(() => formatMoney(1.5, "HNL")).toThrow(RangeError);
  });

  it("formatea millones", () => {
    expect(nb(formatMoney(123456789, "HNL"))).toBe("L 1,234,567.89");
  });
});

describe("formatAmount", () => {
  it("formatea sin símbolo", () => {
    expect(formatAmount(123450)).toBe("1,234.50");
  });
});

describe("parseMoneyInput", () => {
  it.each([
    ["0", 0],
    ["12", 1200],
    ["12.5", 1250],
    ["12.50", 1250],
    ["1,234.56", 123456],
    ["1234.56", 123456],
    [".5", 50],
    ["12.", 1200],
    ["  7.25 ", 725],
    ["1 234.00", 123400],
  ])("convierte %j en %d centavos", (input, cents) => {
    expect(parseMoneyInput(input)).toBe(cents);
  });

  it.each(["", "   ", ".", "abc", "1.234", "12,34", "1,23,456", "--1", "1e3"])(
    "rechaza %j",
    (input) => {
      expect(parseMoneyInput(input)).toBeNull();
    },
  );

  it("rechaza negativos por defecto", () => {
    expect(parseMoneyInput("-10")).toBeNull();
  });

  it("acepta negativos cuando se permite", () => {
    expect(parseMoneyInput("-10.5", { allowNegative: true })).toBe(-1050);
  });
});
