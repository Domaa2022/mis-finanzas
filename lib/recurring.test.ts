import { describe, expect, it } from "vitest";
import {
  dayRuleLabel,
  dueSoonLabel,
  firstChargeDate,
  isDueWithinWeek,
  monthlyEquivalent,
  nextChargeDate,
  validDayRule,
} from "./recurring";

describe("nextChargeDate", () => {
  it("mensual el día 25", () => {
    expect(nextChargeDate("monthly", 25, "2026-11-22")).toBe("2026-11-25");
    expect(nextChargeDate("monthly", 25, "2026-11-25")).toBe("2026-12-25");
  });

  it("mensual el último día, en febrero y meses de 30 días (regla 7)", () => {
    expect(nextChargeDate("monthly", -1, "2027-01-31")).toBe("2027-02-28");
    expect(nextChargeDate("monthly", -1, "2028-01-31")).toBe("2028-02-29");
    expect(nextChargeDate("monthly", 31, "2026-03-31")).toBe("2026-04-30");
  });

  it("anual el 14 de febrero", () => {
    expect(nextChargeDate("yearly", 214, "2026-11-22")).toBe("2027-02-14");
    expect(nextChargeDate("yearly", 214, "2027-02-14")).toBe("2028-02-14");
  });

  it("anual el 29 de febrero cae el 28 en años normales", () => {
    expect(nextChargeDate("yearly", 229, "2026-03-01")).toBe("2027-02-28");
    expect(nextChargeDate("yearly", 229, "2027-03-01")).toBe("2028-02-29");
  });

  it("semanal", () => {
    expect(nextChargeDate("weekly", 1, "2026-11-22")).toBe("2026-11-23");
  });

  it("el primer cobro incluye hoy", () => {
    expect(firstChargeDate("monthly", 22, "2026-11-22")).toBe("2026-11-22");
    expect(firstChargeDate("monthly", 21, "2026-11-22")).toBe("2026-12-21");
  });
});

describe("validDayRule", () => {
  it("valida según la frecuencia", () => {
    expect(validDayRule("weekly", 7)).toBe(true);
    expect(validDayRule("monthly", -1)).toBe(true);
    expect(validDayRule("monthly", 32)).toBe(false);
    expect(validDayRule("yearly", 229)).toBe(true);
    expect(validDayRule("yearly", 231)).toBe(false);
    expect(validDayRule("yearly", 1301)).toBe(false);
  });
});

describe("montos y textos", () => {
  it("equivalente mensual", () => {
    expect(monthlyEquivalent("monthly", 30000)).toBe(30000);
    expect(monthlyEquivalent("yearly", 120000)).toBe(10000);
    expect(monthlyEquivalent("weekly", 1200)).toBe(5200);
  });

  it("describe el día de cobro", () => {
    expect(dayRuleLabel("monthly", 25)).toBe("día 25");
    expect(dayRuleLabel("monthly", -1)).toBe("último día");
    expect(dayRuleLabel("yearly", 214)).toBe("14 feb");
    expect(dayRuleLabel("weekly", 5)).toBe("viernes");
  });

  it("dice cuánto falta", () => {
    expect(dueSoonLabel("2026-11-25", "2026-11-22")).toBe("En 3 días");
    expect(dueSoonLabel("2026-11-22", "2026-11-22")).toBe("Hoy");
    expect(dueSoonLabel("2026-11-23", "2026-11-22")).toBe("Mañana");
    expect(dueSoonLabel("2026-12-15", "2026-11-22")).toBeNull();
    expect(isDueWithinWeek("2026-11-29", "2026-11-22")).toBe(true);
    expect(isDueWithinWeek("2026-11-30", "2026-11-22")).toBe(false);
  });
});
