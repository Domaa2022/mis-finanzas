"use client";

import Link from "next/link";
import { Bell, ChartNoAxesColumn, ChevronDown, Repeat, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/layout/Logo";
import { AccountTile } from "@/components/ui/AccountTile";
import { Money } from "@/components/ui/Money";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { CURRENCY_NAME } from "@/lib/money";
import { DEMO_ACCOUNTS, DEMO_MONTH, DEMO_USER } from "@/lib/demo";

/**
 * Página de muestra de la Fase 0, basada en `Inicio-cuentas` y `Web-inicio`.
 * Los datos son de ejemplo; en la Fase 2 salen de Supabase.
 */
export function DemoHome() {
  const [selected, setSelected] = useState<string>("all");
  const totalHnl = DEMO_ACCOUNTS.filter((a) => a.currency === "HNL").reduce((sum, a) => sum + a.balanceCents, 0);

  const accountSelector = (
    <button
      type="button"
      aria-haspopup="listbox"
      className="flex h-11 cursor-pointer items-center gap-2 self-start rounded-full border border-white/35 bg-white/12 pr-3.5 pl-4 text-[15px] font-medium text-white"
    >
      Todas las cuentas
      <ChevronDown aria-hidden size={18} strokeWidth={2} />
    </button>
  );

  const bell = (
    <button
      type="button"
      aria-label="Notificaciones"
      className="flex size-11 cursor-pointer items-center justify-center rounded-full text-white hover:bg-white/10"
    >
      <Bell aria-hidden size={22} strokeWidth={1.75} />
    </button>
  );

  return (
    <>
      <PageHeader
        eyebrow={DEMO_MONTH}
        title={`Hola, ${DEMO_USER}`}
        topBar={
          <div className="flex items-center justify-between lg:hidden">
            <Logo variant="on-primary" />
            {bell}
          </div>
        }
        actions={
          <div className="hidden items-center gap-2 lg:flex">
            {accountSelector}
            {bell}
          </div>
        }
      >
        <div className="lg:hidden">{accountSelector}</div>
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
          <div className="flex gap-2.5 overflow-x-auto px-6 pb-1 lg:grid lg:grid-cols-[repeat(auto-fill,minmax(168px,1fr))] lg:gap-3 lg:overflow-visible lg:px-0 lg:pb-0">
            <AccountTile
              type="all"
              name="Todas"
              subtitle={`${DEMO_ACCOUNTS.length} cuentas`}
              balanceCents={totalHnl}
              currency="HNL"
              selected={selected === "all"}
              onSelect={() => setSelected("all")}
              className="w-[132px] flex-none lg:w-auto"
            />
            {DEMO_ACCOUNTS.map((account) => (
              <AccountTile
                key={account.id}
                type={account.type}
                name={account.name}
                subtitle={`${account.bank} · ${CURRENCY_NAME[account.currency]}`}
                balanceCents={account.balanceCents}
                currency={account.currency}
                color={account.color}
                selected={selected === account.id}
                onSelect={() => setSelected(account.id)}
                className="w-[132px] flex-none lg:w-auto"
              />
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-4 px-6 lg:flex-row-reverse lg:flex-wrap lg:items-start lg:gap-8 lg:px-0">
          <section className="flex flex-col gap-4 lg:flex-[1_1_280px] lg:gap-3.5">
            <h2 className="hidden text-lg font-semibold tracking-[-0.01em] lg:block">Resumen del mes</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
              <SummaryCard label="Gastos del mes" cents={1_845_025} />
              <SummaryCard label="Ahorrado" cents={600_000} />
            </div>
            <div className="grid grid-cols-2 gap-2.5 lg:hidden">
              <QuickLink href="/gastos-fijos" icon={Repeat} title="Gastos fijos" subtitle="2 cobros esta semana" />
              <QuickLink href="/presupuestos" icon={ChartNoAxesColumn} title="Presupuestos" subtitle="Quedan 8 días" />
            </div>
          </section>

          <section className="flex min-w-0 flex-col gap-2.5 lg:flex-[999_1_480px] lg:gap-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[17px] font-semibold tracking-[-0.01em] lg:text-lg">Últimos movimientos</h2>
              <Link href="/movimientos" className="hidden text-sm font-semibold lg:inline">
                Ver todos
              </Link>
            </div>
            <p className="text-sm leading-normal text-ink-3 lg:hidden">
              Aún no hay movimientos. Cada gasto que registres quedará en la cuenta que elijas.
            </p>
            <div className="hidden overflow-x-auto rounded-[14px] border border-line lg:block">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="bg-surface text-left text-ink-3">
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Descripción</th>
                    <th className="px-4 py-3 font-medium">Cuenta</th>
                    <th className="px-4 py-3 text-right font-medium">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center leading-normal text-ink-3">
                      <span className="mb-1 block text-[15px] font-semibold text-ink">Aún no hay movimientos este mes</span>
                      Usa <span className="font-semibold text-primary">Registrar gasto</span> y elige la cuenta de donde
                      salió el dinero.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </Sheet>
    </>
  );
}

function SummaryCard({ label, cents }: { label: string; cents: number }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-surface px-4 py-3.5 lg:rounded-[14px] lg:px-5 lg:py-[18px]">
      <span className="text-[13px] text-ink-3 lg:text-sm">{label}</span>
      <Money cents={cents} currency="HNL" className="text-xl lg:text-2xl" />
    </div>
  );
}

function QuickLink({ href, icon: Icon, title, subtitle }: { href: string; icon: LucideIcon; title: string; subtitle: string }) {
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
