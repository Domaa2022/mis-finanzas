import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftRight, Plus } from "lucide-react";
import { Suspense } from "react";
import { AccountList } from "@/components/accounts/AccountList";
import { ListSkeleton, StatsSkeleton } from "@/components/skeletons/Skeletons";
import { Money } from "@/components/ui/Money";
import { HeaderPillLink, PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { StatCard } from "@/components/ui/StatCard";
import { totalsByCurrency } from "@/lib/balances";
import { getAccounts } from "@/lib/data/core";

export const metadata: Metadata = { title: "Mis cuentas" };

export default function AccountsPage({ searchParams }: PageProps<"/cuentas">) {
  return (
    <>
      <PageHeader
        title="Mis cuentas"
        subtitle={
          <Suspense fallback={<span className="invisible">Cargando</span>}>
            <ActiveCount />
          </Suspense>
        }
        back={{ href: "/", label: "Inicio" }}
        actions={
          <div className="hidden gap-2.5 lg:flex">
            <HeaderPillLink href="/transferir">
              <ArrowLeftRight aria-hidden size={18} strokeWidth={1.75} />
              Transferir
            </HeaderPillLink>
            <HeaderPillLink href="/cuentas/nueva" solid>
              <Plus aria-hidden size={18} strokeWidth={2} />
              Agregar cuenta
            </HeaderPillLink>
          </div>
        }
      />
      <Sheet className="gap-3.5">
        <Suspense
          fallback={
            <>
              <StatsSkeleton />
              <ListSkeleton />
            </>
          }
        >
          <AccountsContent searchParams={searchParams} />
        </Suspense>
      </Sheet>
    </>
  );
}

async function ActiveCount() {
  const accounts = await getAccounts();
  const n = accounts.length;
  return <>{n === 1 ? "1 cuenta activa" : `${n} cuentas activas`}</>;
}

async function AccountsContent({ searchParams }: { searchParams: PageProps<"/cuentas">["searchParams"] }) {
  const { archivadas } = await searchParams;
  const showArchived = archivadas === "1";
  const all = await getAccounts(true);
  const active = all.filter((a) => !a.archived_at);
  const archived = all.filter((a) => a.archived_at);
  const totals = totalsByCurrency(active);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:max-w-[720px] lg:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
        <StatCard label="Total en lempiras">
          <Money cents={totals.HNL} currency="HNL" />
        </StatCard>
        <StatCard label="Total en dólares">
          <Money cents={totals.USD} currency="USD" />
        </StatCard>
      </div>

      <section className="flex flex-col gap-3.5 lg:mt-4">
        <h2 className="hidden text-lg font-semibold tracking-[-0.01em] lg:block">Cuentas activas</h2>
        {active.length > 0 ? (
          <AccountList accounts={active} />
        ) : (
          <p className="py-6 text-center text-sm leading-normal text-ink-3 lg:text-left">
            Aún no tienes cuentas. Agrega la primera para empezar a registrar gastos.
          </p>
        )}
      </section>

      <div className="flex flex-col gap-3.5 lg:hidden">
        <Link
          href="/cuentas/nueva"
          className="flex h-[50px] items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-line-strong text-[15px] font-semibold text-ink hover:text-ink"
        >
          <Plus aria-hidden size={18} strokeWidth={2} />
          Agregar cuenta
        </Link>
        <Link
          href="/transferir"
          className="flex h-[50px] items-center justify-center gap-2 rounded-xl border border-line-strong text-[15px] font-semibold text-ink hover:text-ink"
        >
          <ArrowLeftRight aria-hidden size={18} strokeWidth={1.75} />
          Transferir entre cuentas
        </Link>
      </div>

      {archived.length > 0 &&
        (showArchived ? (
          <section className="flex flex-col gap-3.5 lg:mt-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[17px] font-semibold tracking-[-0.01em] lg:text-lg">Cuentas archivadas</h2>
              <Link href="/cuentas" className="text-sm font-medium text-ink-3">
                Ocultar
              </Link>
            </div>
            <AccountList accounts={archived} />
          </section>
        ) : (
          <Link
            href="/cuentas?archivadas=1"
            className="self-center py-1.5 text-sm font-medium text-ink-3 hover:text-ink lg:self-start"
          >
            Ver cuentas archivadas ({archived.length})
          </Link>
        ))}
    </>
  );
}
