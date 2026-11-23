import type { Metadata } from "next";
import Link from "next/link";
import { ChartNoAxesColumn, Plus, Repeat, type LucideIcon } from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { AccountPill, AccountTiles, type FilterAccount } from "@/components/home/AccountFilter";
import { Logo } from "@/components/layout/Logo";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ListSkeleton, StatsSkeleton, TilesSkeleton } from "@/components/skeletons/Skeletons";
import { TransactionList } from "@/components/transactions/TransactionList";
import { Money } from "@/components/ui/Money";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { StatCard } from "@/components/ui/StatCard";
import { groupPairedAccounts } from "@/lib/accounts/cards";
import { accountSubtitle } from "@/lib/accounts/schema";
import { totalsByCurrency } from "@/lib/balances";
import { getAccounts, getProfile } from "@/lib/data/core";
import { getHomeExtras } from "@/lib/data/home";
import { getMonthTotals, getTransactions } from "@/lib/data/transactions";
import { monthLabel, quedanDiasLabel } from "@/lib/dates";
import { CURRENCY_NAME } from "@/lib/money";

export const metadata: Metadata = { title: "Inicio" };

type SearchParams = PageProps<"/">["searchParams"];

async function selectedAccount(searchParams: SearchParams): Promise<string | null> {
  const { cuenta } = await searchParams;
  return typeof cuenta === "string" && /^[0-9a-f-]{36}$/i.test(cuenta) ? cuenta : null;
}

export default function HomePage({ searchParams }: PageProps<"/">) {
  const bell = <NotificationBell />;

  return (
    <>
      <PageHeader
        eyebrow={
          <Suspense fallback={<span className="invisible">Mes</span>}>
            <CurrentMonth />
          </Suspense>
        }
        title={
          <Suspense fallback="Hola">
            <Greeting />
          </Suspense>
        }
        topBar={
          <div className="flex items-center justify-between lg:hidden">
            <Logo variant="on-primary" />
            {bell}
          </div>
        }
        actions={
          <div className="hidden items-center gap-2 lg:flex">
            <Suspense fallback={null}>
              <Pill />
            </Suspense>
            {bell}
          </div>
        }
      >
        <div className="lg:hidden">
          <Suspense fallback={<div className="h-11" />}>
            <Pill />
          </Suspense>
        </div>
      </PageHeader>

      <Sheet className="px-0 lg:px-[clamp(24px,4vw,56px)]">
        <section className="flex flex-col gap-3 lg:gap-3.5">
          <div className="flex items-baseline justify-between gap-3 px-6 lg:px-0">
            <h2 className="text-[17px] font-semibold tracking-[-0.01em] lg:text-lg">Tus cuentas</h2>
            <Link href="/cuentas" className="text-sm font-semibold">
              <span className="lg:hidden">Administrar</span>
              <span className="hidden lg:inline">Administrar cuentas</span>
            </Link>
          </div>
          <Suspense fallback={<TilesSkeleton />}>
            <Tiles />
          </Suspense>
        </section>

        <div className="flex flex-col gap-4 px-6 lg:flex-row-reverse lg:flex-wrap lg:items-start lg:gap-8 lg:px-0">
          <section className="flex flex-col gap-4 lg:flex-[1_1_280px] lg:gap-3.5">
            <h2 className="hidden text-lg font-semibold tracking-[-0.01em] lg:block">Resumen del mes</h2>
            <Suspense fallback={<StatsSkeleton />}>
              <Summary searchParams={searchParams} />
            </Suspense>
            <Suspense fallback={null}>
              <QuickLinks />
            </Suspense>
          </section>

          <section className="flex min-w-0 flex-col gap-2.5 lg:flex-[999_1_480px] lg:gap-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[17px] font-semibold tracking-[-0.01em] lg:text-lg">Últimos movimientos</h2>
              <Link href="/movimientos" className="text-sm font-semibold">
                Ver todos
              </Link>
            </div>
            <Suspense fallback={<ListSkeleton rows={3} />}>
              <Recent searchParams={searchParams} />
            </Suspense>
          </section>
        </div>
      </Sheet>
    </>
  );
}

async function CurrentMonth() {
  const { today } = await getProfile();
  return <>{monthLabel(today)}</>;
}

async function Greeting() {
  const { displayName } = await getProfile();
  return <>Hola, {displayName}</>;
}

/** Cuentas para filtrar Inicio. Una tarjeta bimoneda es una sola opción con sus dos deudas. */
async function filterAccounts(): Promise<FilterAccount[]> {
  const accounts = await getAccounts();
  return groupPairedAccounts(accounts).map(({ main: a, other }) => ({
    id: a.id,
    type: a.type,
    name: a.name,
    subtitle: accountSubtitle(a.bank_name, a.type, other ? "Lempiras y dólares" : CURRENCY_NAME[a.currency]),
    currency: a.currency,
    color: a.color,
    balance_cents: a.balance_cents,
    extra: other ? { cents: other.balance_cents, currency: other.currency } : null,
  }));
}

async function Pill() {
  const accounts = await filterAccounts();
  if (accounts.length === 0) return null;
  return <AccountPill accounts={accounts} />;
}

async function Tiles() {
  const accounts = await getAccounts();
  if (accounts.length === 0) {
    return (
      <div className="px-6 lg:px-0">
        <Link
          href="/cuentas/nueva"
          className="flex min-h-[72px] items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-line-strong px-4 text-[15px] font-semibold text-ink hover:text-ink lg:max-w-sm"
        >
          <Plus aria-hidden size={18} strokeWidth={2} />
          Agrega tu primera cuenta
        </Link>
      </div>
    );
  }
  const totals = totalsByCurrency(accounts);
  return (
    <AccountTiles
      accounts={await filterAccounts()}
      allTotal={totals.HNL}
      allUsdTotal={totals.hasUsd ? totals.USD : null}
    />
  );
}

/** Cifra de un resumen con lempiras y, si hay, dólares por separado (regla 3). */
function TwoCurrencies({ hnl, usd }: { hnl: number; usd: number }) {
  return (
    <>
      <Money cents={hnl} currency="HNL" />
      {usd !== 0 && <Money cents={usd} currency="USD" className="text-sm text-ink-3 lg:text-base" />}
    </>
  );
}

async function Summary({ searchParams }: { searchParams: SearchParams }) {
  const [{ today }, accountId] = await Promise.all([getProfile(), selectedAccount(searchParams)]);
  const totals = await getMonthTotals(today, accountId);
  const empty =
    totals.expenses.HNL + totals.expenses.USD + totals.saved.HNL + totals.saved.USD + totals.income.HNL + totals.income.USD ===
    0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
      <StatCard label="Gastos del mes" variant={empty ? "outline" : "filled"}>
        {empty ? "—" : <TwoCurrencies hnl={totals.expenses.HNL} usd={totals.expenses.USD} />}
      </StatCard>
      <StatCard label="Ahorrado" variant={empty ? "outline" : "filled"}>
        {empty ? "—" : <TwoCurrencies hnl={totals.saved.HNL} usd={totals.saved.USD} />}
      </StatCard>
    </div>
  );
}

async function QuickLinks() {
  const [{ today }, extras] = await Promise.all([getProfile(), getHomeExtras()]);
  return (
    <div className="grid grid-cols-2 gap-2.5 lg:hidden">
      <QuickLink href="/gastos-fijos" icon={Repeat} title="Gastos fijos" subtitle={extras.recurringSubtitle} />
      <QuickLink href="/presupuestos" icon={ChartNoAxesColumn} title="Presupuestos" subtitle={quedanDiasLabel(today)} />
    </div>
  );
}

function QuickLink({ href, icon: Icon, title, subtitle }: { href: string; icon: LucideIcon; title: string; subtitle: ReactNode }) {
  return (
    <Link
      href={href}
      className="flex min-w-0 items-center gap-2.5 rounded-xl border border-line p-3 text-ink hover:border-line-strong hover:text-ink"
    >
      <span className="flex size-8 flex-none items-center justify-center rounded-lg bg-ink text-white">
        <Icon aria-hidden size={18} strokeWidth={1.75} />
      </span>
      <span className="flex min-w-0 flex-col gap-px">
        <span className="text-sm font-semibold">{title}</span>
        <span className="truncate text-xs text-ink-3">{subtitle}</span>
      </span>
    </Link>
  );
}

async function Recent({ searchParams }: { searchParams: SearchParams }) {
  const [{ today }, accountId] = await Promise.all([getProfile(), selectedAccount(searchParams)]);
  const items = await getTransactions({ accountId, limit: 8 });
  return (
    <TransactionList
      items={items}
      today={today}
      empty={
        <>
          <div className="flex flex-col items-center gap-2.5 px-4 py-10 text-center lg:hidden">
            <span className="text-base font-semibold">Aún no registras gastos este mes</span>
            <span className="text-sm leading-normal text-ink-3">
              Toca <span className="font-semibold text-primary">Registrar gasto</span> para empezar a ver a dónde va tu
              dinero.
            </span>
          </div>
          <div className="hidden rounded-[14px] border border-line px-4 py-12 text-center text-sm leading-normal text-ink-3 lg:block">
            <span className="mb-1 block text-[15px] font-semibold text-ink">Aún no hay movimientos este mes</span>
            Usa <span className="font-semibold text-primary">Registrar gasto</span> y elige la cuenta de donde salió el
            dinero.
          </div>
        </>
      }
    />
  );
}
