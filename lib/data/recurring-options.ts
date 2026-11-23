import "server-only";
import { accountSubtitle } from "@/lib/accounts/schema";
import type { RecurringAccount, RecurringCategory } from "@/components/recurring/RecurringForm";
import { CURRENCY_NAME } from "@/lib/money";
import { getAccounts, getCategories } from "./core";

export async function getRecurringOptions(): Promise<{ accounts: RecurringAccount[]; categories: RecurringCategory[] }> {
  const [accounts, categories] = await Promise.all([getAccounts(), getCategories("expense")]);
  return {
    accounts: accounts.map((a) => ({
      value: a.id,
      label: a.name,
      subtitle: accountSubtitle(a.bank_name, a.type, CURRENCY_NAME[a.currency]),
      color: a.color,
      accountType: a.type,
      currency: a.currency,
    })),
    categories: categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color })),
  };
}
