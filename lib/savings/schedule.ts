/**
 * Calendario y reglas del ahorro programado (reglas 4–7).
 * El job diario corre en SQL (`run_due_savings`); estas funciones son su espejo
 * en TypeScript para la interfaz ("Próximos aportes") y se comparan en los tests.
 */
import { addDays, dayOfMonth, isoWeekday, type ISODate } from "@/lib/dates";
import type { Frequency, ScheduleEnds, ScheduleMode } from "@/lib/supabase/database.types";

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
};

const FREQUENCY_EVERY: Record<Frequency, string> = {
  weekly: "cada semana",
  biweekly: "cada quincena",
  monthly: "cada mes",
};

export const WEEKDAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"] as const;

/** Combinaciones de días frecuentes para el ahorro quincenal. */
export const BIWEEKLY_PRESETS: { days: [number, number]; label: string }[] = [
  { days: [15, -1], label: "Día 15 y último día del mes" },
  { days: [1, 15], label: "Día 1 y día 15" },
];

/** Texto de un día del mes: 1–31 o −1 (último). */
export function dayRuleLabel(rule: number): string {
  return rule === -1 ? "último día del mes" : `día ${rule}`;
}

export function daysLabel(frequency: Frequency, days: readonly number[]): string {
  if (frequency === "weekly") return `Cada ${WEEKDAYS[(days[0] ?? 1) - 1]}`;
  const preset = BIWEEKLY_PRESETS.find((p) => p.days[0] === days[0] && p.days[1] === days[1]);
  if (frequency === "biweekly" && preset) return preset.label;
  const parts = days.map(dayRuleLabel);
  const text = parts.join(" y ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** ¿Los días son válidos para la frecuencia? */
export function validDays(frequency: Frequency, days: readonly number[]): boolean {
  const dayOk = (d: number) => Number.isInteger(d) && (d === -1 || (d >= 1 && d <= 31));
  if (frequency === "weekly") return days.length === 1 && Number.isInteger(days[0]) && days[0] >= 1 && days[0] <= 7;
  if (frequency === "monthly") return days.length === 1 && dayOk(days[0]);
  return days.length === 2 && days.every(dayOk);
}

/**
 * Próxima fecha de aporte estrictamente posterior a `after`.
 * - Semanal: `days[0]` es el día de la semana ISO (1 = lunes).
 * - Quincenal y mensual: días del mes; −1 es el último y los días que no
 *   existen se ajustan al último (31 → 30 de abril, → 28/29 de febrero).
 */
export function nextRunDate(frequency: Frequency, days: readonly number[], after: ISODate): ISODate {
  if (frequency === "weekly") {
    const diff = (days[0] - isoWeekday(after) + 7) % 7;
    return addDays(after, diff === 0 ? 7 : diff);
  }
  const [y, m] = after.split("-").map(Number);
  for (let i = 0; i < 3; i++) {
    const total = y * 12 + (m - 1) + i;
    const year = Math.floor(total / 12);
    const month = (total % 12) + 1;
    const candidates = days.map((d) => dayOfMonth(year, month, d)).filter((c) => c > after);
    if (candidates.length) return candidates.sort()[0];
  }
  throw new Error("Días de aporte inválidos");
}

/** Las próximas `count` fechas de aporte a partir de `first` (incluida). */
export function upcomingRuns(frequency: Frequency, days: readonly number[], first: ISODate, count: number): ISODate[] {
  const runs = [first];
  while (runs.length < count) runs.push(nextRunDate(frequency, days, runs[runs.length - 1]));
  return runs;
}

/** Aportes en un mes típico, para "Apartarás al mes". */
export function runsPerMonth(frequency: Frequency): number {
  return frequency === "weekly" ? 4 : frequency === "biweekly" ? 2 : 1;
}

/** Monto por porcentaje (regla 4): parte entera de centavos de los ingresos del periodo. */
export function percentAmount(incomeCents: number, percent: number): number {
  return Math.floor((incomeCents * Math.round(percent * 100)) / 10_000);
}

export type RunInput = {
  mode: ScheduleMode;
  amountCents: number | null;
  percent: number | null;
  /** Ingresos que entraron a la cuenta desde el aporte anterior. */
  incomeSinceLastCents: number;
  balanceCents: number;
  accountIsCreditCard: boolean;
  ends: ScheduleEnds;
  /** Lo que falta para la meta (si `ends = on_goal`). */
  remainingToGoalCents: number;
};

export type RunDecision =
  | { action: "contribute"; amountCents: number; completesGoal: boolean }
  | { action: "skip"; reason: "no_income" | "insufficient" | "goal_reached" };

/**
 * Qué hacer en una fecha de aporte:
 * - Porcentaje sin ingresos: no se aparta nada ni se crea movimiento (regla 4).
 * - Sin saldo suficiente: se omite y se notifica; nunca deja la cuenta en
 *   negativo, salvo tarjetas de crédito (regla 5).
 * - "Cuando complete la meta": el último aporte se limita a lo que falta y la
 *   programación se desactiva al llegar a la meta (regla 6).
 */
export function decideRun(input: RunInput): RunDecision {
  if (input.ends === "on_goal" && input.remainingToGoalCents <= 0) return { action: "skip", reason: "goal_reached" };

  let amount =
    input.mode === "fixed" ? (input.amountCents ?? 0) : percentAmount(input.incomeSinceLastCents, input.percent ?? 0);
  if (amount <= 0) return { action: "skip", reason: "no_income" };

  if (input.ends === "on_goal") amount = Math.min(amount, input.remainingToGoalCents);

  if (!input.accountIsCreditCard && input.balanceCents < amount) return { action: "skip", reason: "insufficient" };

  return {
    action: "contribute",
    amountCents: amount,
    completesGoal: input.ends === "on_goal" && amount >= input.remainingToGoalCents,
  };
}

/** Fecha estimada en que se completa la meta con un monto fijo (null si no aplica). */
export function projectedCompletion(
  frequency: Frequency,
  days: readonly number[],
  firstRun: ISODate,
  amountCents: number,
  remainingCents: number,
): ISODate | null {
  if (amountCents <= 0 || remainingCents <= 0) return null;
  const runs = Math.ceil(remainingCents / amountCents);
  if (runs > 600) return null;
  let date = firstRun;
  for (let i = 1; i < runs; i++) date = nextRunDate(frequency, days, date);
  return date;
}

/** "L 500.00 cada quincena" o "10 % de cada ingreso". */
export function scheduleHeadline(
  mode: ScheduleMode,
  frequency: Frequency,
  amountLabel: string,
  percent: number | null,
): { figure: string; rest: string } {
  if (mode === "percent") return { figure: `${formatPercent(percent ?? 0)} %`, rest: "de cada ingreso" };
  return { figure: amountLabel, rest: FREQUENCY_EVERY[frequency] };
}

export function formatPercent(p: number): string {
  return Number.isInteger(p) ? String(p) : p.toFixed(2).replace(/0$/, "");
}
