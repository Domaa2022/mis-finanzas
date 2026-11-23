import { z } from "zod";
import { ACCOUNT_COLORS } from "@/lib/accounts/meta";
import { isISODate } from "@/lib/dates";
import { validDays } from "./schedule";

const colorValues = ACCOUNT_COLORS.map((c) => c.value) as [string, ...string[]];

export const GOAL_ICONS = ["plane", "shield", "house", "car", "graduation-cap", "heart-pulse", "shopping-bag", "paw-print", "briefcase", "music"] as const;

export const goalSchema = z.object({
  name: z.string().trim().min(1, "Escribe un nombre").max(40, "Usa como máximo 40 caracteres"),
  icon: z.enum(GOAL_ICONS),
  color: z.enum(colorValues),
  target: z.number({ error: "Escribe cuánto quieres juntar" }).int().positive("La meta debe ser mayor que cero"),
  currency: z.enum(["HNL", "USD"]),
  targetDate: z.string().refine((v) => v === "" || isISODate(v), "Elige una fecha válida"),
});
export type GoalInput = z.infer<typeof goalSchema>;

export const contributionSchema = z.object({
  goalId: z.uuid("Elige una meta"),
  accountId: z.uuid("Elige una cuenta"),
  amount: z.number({ error: "Escribe un monto" }).int().positive("El monto debe ser mayor que cero"),
  occurredOn: z.string().refine(isISODate, "Elige una fecha válida"),
});
export type ContributionInput = z.infer<typeof contributionSchema>;

export const scheduleSchema = z
  .object({
    /** A dónde va el ahorro: a una meta o directo a otra cuenta. */
    destination: z.enum(["goal", "account"]),
    goalId: z.string(),
    toAccountId: z.string(),
    accountId: z.uuid("Elige una cuenta"),
    mode: z.enum(["fixed", "percent"]),
    amount: z.number().int().positive("El monto debe ser mayor que cero").nullable(),
    percent: z.number().positive("Escribe un porcentaje mayor que cero").max(100, "Como máximo 100 %").nullable(),
    frequency: z.enum(["weekly", "biweekly", "monthly"]),
    days: z.array(z.number().int()),
    ends: z.enum(["on_goal", "on_date", "never"]),
    endDate: z.string(),
    /** Esperar a que entre el ingreso del periodo antes de apartar. */
    waitForIncome: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.destination === "goal" && !z.uuid().safeParse(v.goalId).success) {
      ctx.addIssue({ code: "custom", path: ["goalId"], message: "Elige una meta" });
    }
    if (v.destination === "account") {
      if (!z.uuid().safeParse(v.toAccountId).success) {
        ctx.addIssue({ code: "custom", path: ["toAccountId"], message: "Elige la cuenta de ahorro" });
      } else if (v.toAccountId === v.accountId) {
        ctx.addIssue({ code: "custom", path: ["toAccountId"], message: "Elige una cuenta distinta a la de origen" });
      }
      if (v.ends === "on_goal") ctx.addIssue({ code: "custom", path: ["ends"], message: "Elige cuándo termina" });
    }
    if (v.mode === "fixed" && !v.amount) ctx.addIssue({ code: "custom", path: ["amount"], message: "Escribe el monto de cada aporte" });
    if (v.mode === "percent" && !v.percent) ctx.addIssue({ code: "custom", path: ["percent"], message: "Escribe el porcentaje" });
    if (!validDays(v.frequency, v.days)) ctx.addIssue({ code: "custom", path: ["days"], message: "Elige los días del aporte" });
    if (v.ends === "on_date" && !isISODate(v.endDate)) ctx.addIssue({ code: "custom", path: ["endDate"], message: "Elige la fecha final" });
  });
export type ScheduleInput = z.infer<typeof scheduleSchema>;
