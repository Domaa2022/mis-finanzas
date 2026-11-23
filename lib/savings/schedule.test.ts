import { describe, expect, it } from "vitest";
import {
  daysLabel,
  decideRun,
  nextRunDate,
  percentAmount,
  projectedCompletion,
  upcomingRuns,
  validDays,
  type RunInput,
} from "./schedule";

describe("nextRunDate: último día del mes (regla 7)", () => {
  it("día 15 y último día, en noviembre", () => {
    expect(nextRunDate("biweekly", [15, -1], "2026-11-22")).toBe("2026-11-30");
    expect(nextRunDate("biweekly", [15, -1], "2026-11-30")).toBe("2026-12-15");
    expect(nextRunDate("biweekly", [15, -1], "2026-12-15")).toBe("2026-12-31");
  });

  it("en febrero de un año normal el último día es el 28", () => {
    expect(nextRunDate("biweekly", [15, -1], "2027-02-15")).toBe("2027-02-28");
    expect(nextRunDate("monthly", [-1], "2027-01-31")).toBe("2027-02-28");
  });

  it("en febrero bisiesto el último día es el 29", () => {
    expect(nextRunDate("biweekly", [15, -1], "2028-02-15")).toBe("2028-02-29");
    expect(nextRunDate("monthly", [-1], "2028-02-28")).toBe("2028-02-29");
  });

  it("en meses de 30 días", () => {
    expect(nextRunDate("monthly", [-1], "2026-04-01")).toBe("2026-04-30");
    expect(nextRunDate("monthly", [-1], "2026-06-30")).toBe("2026-07-31");
  });

  it("un día 31 se ajusta al último día en meses cortos", () => {
    expect(nextRunDate("monthly", [31], "2026-03-31")).toBe("2026-04-30");
    expect(nextRunDate("monthly", [31], "2026-04-30")).toBe("2026-05-31");
    expect(nextRunDate("monthly", [30], "2027-01-30")).toBe("2027-02-28");
  });

  it("cruza el fin de año", () => {
    expect(nextRunDate("monthly", [5], "2026-12-05")).toBe("2027-01-05");
  });

  it("es estrictamente posterior a la fecha dada", () => {
    expect(nextRunDate("biweekly", [1, 15], "2026-11-15")).toBe("2026-12-01");
  });

  it("ordena los días aunque vengan desordenados", () => {
    expect(nextRunDate("biweekly", [-1, 15], "2026-11-01")).toBe("2026-11-15");
  });

  it("si dos reglas caen el mismo día, no repite la fecha", () => {
    expect(upcomingRuns("biweekly", [30, -1], "2026-04-30", 3)).toEqual(["2026-04-30", "2026-05-30", "2026-05-31"]);
  });
});

describe("nextRunDate: semanal", () => {
  it("el próximo viernes", () => {
    expect(nextRunDate("weekly", [5], "2026-11-22")).toBe("2026-11-27");
  });
  it("si hoy es el día, es dentro de una semana", () => {
    expect(nextRunDate("weekly", [1], "2026-11-23")).toBe("2026-11-30");
  });
});

describe("upcomingRuns", () => {
  it("devuelve los próximos 3 aportes del diseño", () => {
    expect(upcomingRuns("biweekly", [15, -1], "2026-11-30", 3)).toEqual(["2026-11-30", "2026-12-15", "2026-12-31"]);
  });
});

describe("validDays", () => {
  it("valida según la frecuencia", () => {
    expect(validDays("weekly", [7])).toBe(true);
    expect(validDays("weekly", [8])).toBe(false);
    expect(validDays("biweekly", [15, -1])).toBe(true);
    expect(validDays("biweekly", [15])).toBe(false);
    expect(validDays("monthly", [0])).toBe(false);
    expect(validDays("monthly", [-1])).toBe(true);
  });

  it("describe los días", () => {
    expect(daysLabel("biweekly", [15, -1])).toBe("Día 15 y último día del mes");
    expect(daysLabel("monthly", [-1])).toBe("Último día del mes");
    expect(daysLabel("weekly", [5])).toBe("Cada viernes");
  });
});

describe("percentAmount (regla 4)", () => {
  it("toma el porcentaje de los ingresos y trunca al centavo", () => {
    expect(percentAmount(1_000_000, 10)).toBe(100_000);
    expect(percentAmount(12_345, 10)).toBe(1_234);
    expect(percentAmount(10_000, 12.5)).toBe(1_250);
  });
  it("sin ingresos es cero", () => {
    expect(percentAmount(0, 20)).toBe(0);
  });
});

const base: RunInput = {
  mode: "fixed",
  amountCents: 50_000,
  percent: null,
  incomeSinceLastCents: 0,
  balanceCents: 100_000,
  accountIsCreditCard: false,
  ends: "never",
  remainingToGoalCents: 1_000_000,
};

describe("decideRun", () => {
  it("aporta el monto fijo cuando hay saldo", () => {
    expect(decideRun(base)).toEqual({ action: "contribute", amountCents: 50_000, completesGoal: false });
  });

  it("regla 4: por porcentaje sin ingresos no aparta nada", () => {
    expect(decideRun({ ...base, mode: "percent", percent: 10, amountCents: null })).toEqual({
      action: "skip",
      reason: "no_income",
    });
  });

  it("regla 4: por porcentaje usa los ingresos desde el aporte anterior", () => {
    expect(decideRun({ ...base, mode: "percent", percent: 10, amountCents: null, incomeSinceLastCents: 300_000 })).toEqual({
      action: "contribute",
      amountCents: 30_000,
      completesGoal: false,
    });
  });

  it("regla 5: sin saldo suficiente se omite", () => {
    expect(decideRun({ ...base, balanceCents: 49_999 })).toEqual({ action: "skip", reason: "insufficient" });
  });

  it("regla 5: una tarjeta de crédito sí puede quedar en negativo", () => {
    expect(decideRun({ ...base, balanceCents: 0, accountIsCreditCard: true }).action).toBe("contribute");
  });

  it("regla 6: con 'cuando complete la meta' el último aporte completa justo la meta", () => {
    expect(decideRun({ ...base, ends: "on_goal", remainingToGoalCents: 20_000 })).toEqual({
      action: "contribute",
      amountCents: 20_000,
      completesGoal: true,
    });
  });

  it("regla 6: no se desactiva antes de llegar a la meta", () => {
    expect(decideRun({ ...base, ends: "on_goal", remainingToGoalCents: 60_000 })).toEqual({
      action: "contribute",
      amountCents: 50_000,
      completesGoal: false,
    });
  });

  it("regla 6: si la meta ya está completa no aporta", () => {
    expect(decideRun({ ...base, ends: "on_goal", remainingToGoalCents: 0 })).toEqual({ action: "skip", reason: "goal_reached" });
  });

  it("con otro fin, no limita el monto a la meta", () => {
    expect(decideRun({ ...base, ends: "never", remainingToGoalCents: 1 }).action).toBe("contribute");
  });
});

describe("projectedCompletion", () => {
  it("estima cuándo se llega a la meta", () => {
    // Faltan 1,500; 500 por quincena = 3 aportes: 30 nov, 15 dic, 31 dic.
    expect(projectedCompletion("biweekly", [15, -1], "2026-11-30", 50_000, 150_000)).toBe("2026-12-31");
  });
  it("sin monto no estima", () => {
    expect(projectedCompletion("monthly", [1], "2026-12-01", 0, 100)).toBeNull();
  });
});
