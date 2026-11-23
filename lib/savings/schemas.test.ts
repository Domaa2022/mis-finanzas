import { describe, expect, it } from "vitest";
import { scheduleSchema } from "./schemas";

const base = {
  goalId: "11111111-1111-4111-8111-111111111111",
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
});
