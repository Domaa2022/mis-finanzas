import { describe, expect, it } from "vitest";
import { scheduleSchema } from "./schemas";

const base = {
  destination: "goal" as const,
  goalId: "11111111-1111-4111-8111-111111111111",
  toAccountId: "",
  accountId: "22222222-2222-4222-8222-222222222222",
  mode: "fixed" as const,
  amount: 50000,
  percent: null,
  frequency: "biweekly" as const,
  days: [15, -1],
  ends: "on_goal" as const,
  endDate: "",
};

describe("scheduleSchema", () => {
  it("acepta un monto fijo quincenal", () => {
    expect(scheduleSchema.safeParse(base).success).toBe(true);
  });

  it("exige el porcentaje en modo porcentaje", () => {
    const r = scheduleSchema.safeParse({ ...base, mode: "percent", amount: null });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(["percent"]);
  });

  it("valida los días según la frecuencia", () => {
    expect(scheduleSchema.safeParse({ ...base, frequency: "monthly" }).success).toBe(false);
    expect(scheduleSchema.safeParse({ ...base, frequency: "monthly", days: [-1] }).success).toBe(true);
  });

  it("exige fecha final con 'En una fecha'", () => {
    expect(scheduleSchema.safeParse({ ...base, ends: "on_date" }).success).toBe(false);
    expect(scheduleSchema.safeParse({ ...base, ends: "on_date", endDate: "2027-06-30" }).success).toBe(true);
  });

  it("hacia una cuenta: exige la cuenta destino, distinta de la de origen, y no termina 'con la meta'", () => {
    const toAccount = { ...base, destination: "account" as const, goalId: "", ends: "never" as const };
    const ahorro = "33333333-3333-4333-8333-333333333333";
    expect(scheduleSchema.safeParse({ ...toAccount, toAccountId: ahorro }).success).toBe(true);
    const missing = scheduleSchema.safeParse(toAccount);
    expect(!missing.success && missing.error.issues[0].path).toEqual(["toAccountId"]);
    expect(scheduleSchema.safeParse({ ...toAccount, toAccountId: base.accountId }).success).toBe(false);
    expect(scheduleSchema.safeParse({ ...toAccount, toAccountId: ahorro, ends: "on_goal" }).success).toBe(false);
  });
});
