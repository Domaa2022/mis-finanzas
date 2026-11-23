/**
 * Suscripciones y gastos fijos: fechas de cobro y montos mensuales.
 * Espejo en TypeScript de `next_charge_date` (SQL), comparado en los tests.
 *
 * `day_rule` según la frecuencia:
 * - Semanal: día de la semana ISO (1 = lunes … 7 = domingo).
 * - Mensual: día del mes 1–31, o −1 para el último día.
 * - Anual: mes × 100 + día (214 = 14 de febrero). El 29 de febrero cae el 28 en años normales.
 */
import { z } from "zod";
import { addDays, dayOfMonth, diffDays, isoWeekday, type ISODate } from "@/lib/dates";
import type { RecurringFrequency } from "@/lib/supabase/database.types";
import { WEEKDAYS } from "@/lib/savings/schedule";

export const RECURRING_FREQUENCY_LABEL: Record<RecurringFrequency, string> = {
  weekly: "Semanal",
  monthly: "Mensual",
  yearly: "Anual",
};

const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function validDayRule(frequency: RecurringFrequency, rule: number): boolean {
  if (!Number.isInteger(rule)) return false;
  if (frequency === "weekly") return rule >= 1 && rule <= 7;
  if (frequency === "monthly") return rule === -1 || (rule >= 1 && rule <= 31);
  const month = Math.floor(rule / 100);
  const day = rule % 100;
  const max = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  return month >= 1 && month <= 12 && day >= 1 && day <= max;
}

/** Fecha de cobro en un año concreto para la regla anual. */
function yearlyDate(year: number, rule: number): ISODate {
  return dayOfMonth(year, Math.floor(rule / 100), rule % 100);
}

/** Próximo cobro estrictamente posterior a `after`. */
export function nextChargeDate(frequency: RecurringFrequency, rule: number, after: ISODate): ISODate {
  if (frequency === "weekly") {
    const diff = (rule - isoWeekday(after) + 7) % 7;
    return addDays(after, diff === 0 ? 7 : diff);
  }
  const [y, m] = after.split("-").map(Number);
  if (frequency === "monthly") {
    for (let i = 0; i < 2; i++) {
      const total = y * 12 + (m - 1) + i;
      const candidate = dayOfMonth(Math.floor(total / 12), (total % 12) + 1, rule);
      if (candidate > after) return candidate;
    }
  } else {
    for (let i = 0; i < 2; i++) {
      const candidate = yearlyDate(y + i, rule);
      if (candidate > after) return candidate;
    }
  }
  throw new Error("Regla de cobro inválida");
}

/** Primer cobro desde hoy (incluido: si hoy toca, se cobra hoy). */
export function firstChargeDate(frequency: RecurringFrequency, rule: number, today: ISODate): ISODate {
  return nextChargeDate(frequency, rule, addDays(today, -1));
}

/** Equivalente mensual de un cargo, en centavos (para "L X al mes"). */
export function monthlyEquivalent(frequency: RecurringFrequency, amountCents: number): number {
  if (frequency === "weekly") return Math.round((amountCents * 52) / 12);
  if (frequency === "yearly") return Math.round(amountCents / 12);
  return amountCents;
}

export function yearlyEquivalent(frequency: RecurringFrequency, amountCents: number): number {
  if (frequency === "weekly") return amountCents * 52;
  if (frequency === "yearly") return amountCents;
  return amountCents * 12;
}

/** "día 25", "último día", "viernes", "14 feb". */
export function dayRuleLabel(frequency: RecurringFrequency, rule: number): string {
  if (frequency === "weekly") return WEEKDAYS[rule - 1] ?? "";
  if (frequency === "monthly") return rule === -1 ? "último día" : `día ${rule}`;
  return `${rule % 100} ${MONTHS_SHORT[Math.floor(rule / 100) - 1]}`;
}

/** "Hoy", "Mañana", "En 3 días" (o null si falta más de una semana). */
export function dueSoonLabel(due: ISODate, today: ISODate): string | null {
  const d = diffDays(today, due);
  if (d < 0) return "Atrasado";
  if (d === 0) return "Hoy";
  if (d === 1) return "Mañana";
  if (d <= 7) return `En ${d} días`;
  return null;
}

/** ¿El cobro cae en los próximos 7 días (incluido hoy)? */
export function isDueWithinWeek(due: ISODate, today: ISODate): boolean {
  const d = diffDays(today, due);
  return d >= 0 && d <= 7;
}

export const REMINDER_OPTIONS = [
  { value: "1", label: "1 día antes" },
  { value: "3", label: "3 días antes" },
  { value: "0", label: "El mismo día" },
  { value: "none", label: "Sin recordatorio" },
] as const;

export const recurringSchema = z
  .object({
    kind: z.enum(["subscription", "fixed"]),
    name: z.string().trim().min(1, "Escribe un nombre").max(40, "Usa como máximo 40 caracteres"),
    amount: z.number({ error: "Escribe el monto" }).int().positive("El monto debe ser mayor que cero"),
    isVariable: z.boolean(),
    accountId: z.uuid("Elige de qué cuenta se cobra"),
    categoryId: z.uuid("Elige una categoría"),
    frequency: z.enum(["weekly", "monthly", "yearly"]),
    dayRule: z.number().int(),
    remindDaysBefore: z.number().int().min(0).max(7).nullable(),
    autoRegister: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (!validDayRule(v.frequency, v.dayRule)) ctx.addIssue({ code: "custom", path: ["dayRule"], message: "Elige el día de cobro" });
  });

export type RecurringInput = z.infer<typeof recurringSchema>;
