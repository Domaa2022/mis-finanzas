import "server-only";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { accountSubtitle } from "@/lib/accounts/schema";
import type { ScheduleAccount, ScheduleGoal } from "@/components/savings/ScheduleForm";
import { CURRENCY_NAME, formatMoney } from "@/lib/money";
import { getAccounts } from "./core";
import { getGoals } from "./savings";

/** Opciones de metas y cuentas para los formularios de ahorro. */
export async function getSavingsOptions() {
  const [goals, accounts] = await Promise.all([getGoals(), getAccounts()]);
  const goalOptions: ScheduleGoal[] = goals.map((g) => ({
    value: g.id,
    label: g.name,
    subtitle: g.target_date
      ? `Para ${format(parseISO(g.target_date), "MMM yyyy", { locale: es }).replace(".", "")} · ${formatMoney(g.saved_cents, g.currency)} de ${formatMoney(g.target_cents, g.currency)}`
      : `Sin fecha límite · ${formatMoney(g.saved_cents, g.currency)} de ${formatMoney(g.target_cents, g.currency)}`,
    color: g.color,
    iconName: g.icon,
    currency: g.currency,
    remaining_cents: Math.max(0, g.target_cents - g.saved_cents),
  }));
  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: a.name,
    subtitle: `${accountSubtitle(a.bank_name, a.type, CURRENCY_NAME[a.currency])} · ${formatMoney(a.balance_cents, a.currency)}`,
    color: a.color,
    accountType: a.type,
    currency: a.currency,
    balance_cents: a.balance_cents,
    is_card: a.type === "credit_card",
  })) satisfies (ScheduleAccount & { balance_cents: number; is_card: boolean })[];
  return { goals: goalOptions, accounts: accountOptions };
}
