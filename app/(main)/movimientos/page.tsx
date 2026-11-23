import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountPill } from "@/components/home/AccountFilter";
import { ListSkeleton, StatsSkeleton } from "@/components/skeletons/Skeletons";
import { TransactionList } from "@/components/transactions/TransactionList";
import { Money } from "@/components/ui/Money";
import { MonthNav } from "@/components/ui/MonthNav";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { StatCard } from "@/components/ui/StatCard";
import { accountSubtitle } from "@/lib/accounts/schema";
import { getAccounts, getProfile } from "@/lib/data/core";
import { getMonthTotals, getTransactions } from "@/lib/data/transactions";
import { endOfMonth, parseMonthParam, startOfMonth } from "@/lib/dates";

export const metadata: Metadata = { title: "Movimientos" };

type SearchParams = PageProps<"/movimientos">["searchParams"];

async function resolveParams(searchParams: SearchParams) {
  const [params, { today }] = await Promise.all([searchParams, getProfile()]);
  const current = startOfMonth(today);
  const requested = parseMonthParam(typeof params.mes === "string" ? params.mes : null);
  const month = requested && requested <= current ? requested : current;
  const accountId = typeof params.cuenta === "string" && /^[0-9a-f-]{36}$/i.test(params.cuenta) ? params.cuenta : null;
  return { month, current, accountId, today };
}

export default function MovementsPage({ searchParams }: PageProps<"/movimientos">) {
  return (
    <>
      <PageHeader title="Movimientos" back={{ href: "/", label: "Inicio" }}>
        <Suspense fallback={<div className="h-11" />}>
          <HeaderControls searchParams={searchParams} />
        </Suspense>
      </PageHeader>
      <Sheet>
        <Suspense
          fallback={
            <>
              <StatsSkeleton />
              <ListSkeleton rows={6} />
            </>
          }
        >
          <Movements searchParams={searchParams} />
        </Suspense>
      </Sheet>
    </>
  );
}

async function HeaderControls({ searchParams }: { searchParams: SearchParams }) {
  const [{ month, current, accountId }, accounts] = await Promise.all([resolveParams(searchParams), getAccounts(true)]);
  return (
    <div className="-ml-3 flex flex-wrap items-center gap-3 lg:ml-0">
      <MonthNav month={month} currentMonth={current} basePath="/movimientos" params={{ cuenta: accountId ?? undefined }} />
      {accounts.length > 0 && (
        <AccountPill
          className="ml-3 lg:ml-0"
          accounts={accounts.map((a) => ({
            id: a.id,
            type: a.type,
            name: a.name,
            subtitle: accountSubtitle(a.bank_name, a.type),
            currency: a.currency,
            color: a.color,
            balance_cents: a.balance_cents,
          }))}
        />
      )}
    </div>
  );
}

async function Movements({ searchParams }: { searchParams: SearchParams }) {
  const { month, accountId, today } = await resolveParams(searchParams);
  const [items, totals] = await Promise.all([
    getTransactions({ accountId, from: month, to: endOfMonth(month) }),
    getMonthTotals(month, accountId),
  ]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:max-w-[720px]">
        <StatCard label="Ingresos">
          <Money cents={totals.income.HNL} currency="HNL" />
          {totals.income.USD > 0 && <Money cents={totals.income.USD} currency="USD" className="text-sm text-ink-3" />}
        </StatCard>
        <StatCard label="Gastos">
          <Money cents={totals.expenses.HNL} currency="HNL" />
          {totals.expenses.USD > 0 && <Money cents={totals.expenses.USD} currency="USD" className="text-sm text-ink-3" />}
        </StatCard>
      </div>
      <p className="-mt-1 text-[13px] text-muted">Las transferencias entre tus cuentas no cuentan como ingreso ni gasto.</p>
      <TransactionList
        items={items}
        today={today}
        grouped
        deletable
        empty={<p className="py-10 text-center text-sm text-ink-3">No hay movimientos en este mes.</p>}
      />
    </>
  );
}
