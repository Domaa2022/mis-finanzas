import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SavingsView } from "@/components/savings/SavingsView";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import type { Goal, ScheduleItem } from "@/lib/data/savings";
import type { TransactionListItem } from "@/lib/data/transactions";

export const metadata: Metadata = { title: "Ahorros (ejemplo)" };

const U = "00000000-0000-4000-8000-000000000000";
const TODAY = "2026-11-22";
const CREATED = "2026-10-01T00:00:00Z";

const GOALS: Goal[] = [
  { id: "g1", user_id: U, name: "Viaje a Roatán con la familia", icon: "plane", color: "#0F766E", target_cents: 2_000_000, target_date: "2027-12-01", currency: "HNL", archived_at: null, created_at: CREATED, saved_cents: 300_000 },
  { id: "g2", user_id: U, name: "Fondo de emergencia", icon: "shield", color: "#1D4ED8", target_cents: 5_000_000, target_date: null, currency: "HNL", archived_at: null, created_at: CREATED, saved_cents: 1_250_000 },
];

const base = {
  user_id: U,
  account_id: "a2",
  percent: null,
  ends: "never" as const,
  end_date: null,
  active: true,
  wait_for_income: true,
  waiting: false,
  last_run_on: "2026-11-15",
  created_at: CREATED,
};

const SCHEDULES: ScheduleItem[] = [
  {
    ...base,
    id: "s1",
    goal_id: "g1",
    to_account_id: null,
    mode: "fixed",
    amount_cents: 150_000,
    frequency: "biweekly",
    days: [15, -1],
    ends: "on_goal",
    next_run_on: "2026-11-15",
    waiting: true,
    destination: { kind: "goal", name: "Viaje a Roatán con la familia", currency: "HNL" },
    account: { id: "a2", name: "Cuenta corriente BAC" },
  },
  {
    ...base,
    id: "s2",
    goal_id: null,
    to_account_id: "a1",
    mode: "fixed",
    amount_cents: 1_250_000,
    frequency: "monthly",
    days: [-1],
    next_run_on: "2026-11-30",
    destination: { kind: "account", name: "Cuenta de ahorro Banco Atlántida", currency: "HNL" },
    account: { id: "a2", name: "Cuenta corriente BAC" },
  },
  {
    ...base,
    id: "s3",
    goal_id: null,
    to_account_id: "a1",
    mode: "percent",
    amount_cents: null,
    percent: 12.5,
    frequency: "weekly",
    days: [5],
    active: false,
    next_run_on: "2026-11-27",
    destination: { kind: "account", name: "Ahorro", currency: "HNL" },
    account: { id: "a2", name: "Corriente" },
  },
];

const RECENT: TransactionListItem[] = [
  {
    id: "t1",
    kind: "goal_contribution",
    amount_cents: 150_000,
    occurred_on: "2026-11-15",
    note: null,
    transfer_id: null,
    goal_id: "g1",
    recurring_id: null,
    account: { id: "a2", name: "Cuenta corriente BAC", currency: "HNL", color: "#1D4ED8" },
    category: null,
    counterpart: "Viaje a Roatán con la familia",
  },
];

/** Pantalla de Ahorros con datos de ejemplo (nombres largos a propósito). Solo existe en desarrollo. */
export default function DevSavingsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <>
      <PageHeader title="Ahorros" back={{ href: "/dev/ui", label: "Componentes" }} />
      <Sheet className="gap-3 lg:gap-8">
        <SavingsView goals={GOALS} schedules={SCHEDULES} recent={RECENT} today={TODAY} />
      </Sheet>
    </>
  );
}
