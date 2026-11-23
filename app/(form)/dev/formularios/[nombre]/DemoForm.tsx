"use client";

import { AccountForm } from "@/components/accounts/AccountForm";
import { ContributionForm } from "@/components/savings/ContributionForm";
import { GoalForm } from "@/components/savings/GoalForm";
import { ScheduleForm } from "@/components/savings/ScheduleForm";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { TransferForm } from "@/components/transfers/TransferForm";
import { DEMO_ACCOUNTS } from "@/lib/demo";
import { formatMoney } from "@/lib/money";
import { DEMO_FORMS } from "./forms";

const TODAY = "2026-11-22";

const accounts = DEMO_ACCOUNTS.map((a) => ({
  id: a.id.replace(/^a/, "aaaaaaaa-0000-4000-8000-00000000000"),
  name: a.name,
  type: a.type,
  bank: a.bank,
  currency: a.currency,
  color: a.color,
  balance_cents: a.balanceCents,
}));

const goals = [
  { value: "bbbbbbbb-0000-4000-8000-000000000001", label: "Viaje", subtitle: "Para dic 2027 · L 3,000.00 de L 20,000.00", color: "#0F766E", iconName: "plane", currency: "HNL" as const, remaining_cents: 1_700_000 },
  { value: "bbbbbbbb-0000-4000-8000-000000000002", label: "Fondo de emergencia", subtitle: "Sin fecha límite · L 0.00 de L 50,000.00", color: "#1D4ED8", iconName: "shield", currency: "HNL" as const, remaining_cents: 5_000_000 },
];

const accountOptions = accounts.map((a) => ({
  value: a.id,
  label: a.name,
  subtitle: `${a.bank} · ${formatMoney(a.balance_cents, a.currency)}`,
  color: a.color,
  accountType: a.type,
  currency: a.currency,
  balance_cents: a.balance_cents,
  is_card: a.type === "credit_card",
}));

const categories = [
  { id: "cccccccc-0000-4000-8000-000000000001", name: "Comida", icon: "utensils", color: "#0F766E" },
  { id: "cccccccc-0000-4000-8000-000000000002", name: "Transporte", icon: "car", color: "#1D4ED8" },
  { id: "cccccccc-0000-4000-8000-000000000003", name: "Entretenimiento", icon: "clapperboard", color: "#6D28D9" },
  { id: "cccccccc-0000-4000-8000-000000000004", name: "Compras", icon: "shopping-bag", color: "#BE185D" },
  { id: "cccccccc-0000-4000-8000-000000000005", name: "Salud", icon: "heart-pulse", color: "#334155" },
  { id: "cccccccc-0000-4000-8000-000000000006", name: "Hogar", icon: "house", color: "#A16207" },
];


export function DemoForm({ nombre }: { nombre: keyof typeof DEMO_FORMS }) {
  switch (nombre) {
    case "nueva-cuenta":
      return <AccountForm mode="create" />;
    case "registrar":
      return (
        <TransactionForm
          accounts={accounts}
          expenseCategories={categories}
          incomeCategories={categories.slice(0, 2)}
          defaultAccountId={accounts[1].id}
          defaultKind="expense"
          today={TODAY}
          returnTo="/dev/ui"
        />
      );
    case "transferir":
      return <TransferForm accounts={accounts} defaultFrom={accounts[1].id} today={TODAY} />;
    case "programar-ahorro":
      return <ScheduleForm goals={goals} accounts={accountOptions} defaultGoalId={null} today={TODAY} />;
    case "nueva-meta":
      return <GoalForm today={TODAY} />;
    case "aportar":
      return <ContributionForm goals={goals} accounts={accountOptions} defaultGoalId={null} today={TODAY} />;
  }
}
