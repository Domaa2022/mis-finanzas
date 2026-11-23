import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Plus } from "lucide-react";
import { Suspense } from "react";
import { PendingCharges } from "@/components/recurring/PendingCharges";
import { RecurringSection } from "@/components/recurring/RecurringList";
import { ListSkeleton } from "@/components/skeletons/Skeletons";
import { HeaderPillLink, PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { StatCard } from "@/components/ui/StatCard";
import { cn } from "@/lib/cn";
import { getProfile } from "@/lib/data/core";
import { getPendingCharges, getRecurring, summarize } from "@/lib/data/recurring";
import { formatMoney, type Currency } from "@/lib/money";

export const metadata: Metadata = { title: "Gastos fijos" };

type Filter = "todos" | "suscripciones" | "fijos";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "suscripciones", label: "Suscripciones" },
  { value: "fijos", label: "Gastos fijos" },
];

/** "L 1,200.00" y, si hay, "+ $ 15.00". */
function money2(t: Record<Currency, number>) {
  const hnl = formatMoney(t.HNL, "HNL");
  return t.USD ? `${hnl} + ${formatMoney(t.USD, "USD")}` : hnl;
}

export default function RecurringPage({ searchParams }: PageProps<"/gastos-fijos">) {
  return (
    <>
      <PageHeader
        title="Gastos fijos"
        back={{ href: "/", label: "Inicio" }}
        figure={
          <Suspense fallback={<span className="invisible">L 0.00</span>}>
            <HeaderFigure />
          </Suspense>
        }
        actions={
          <HeaderPillLink href="/gastos-fijos/nuevo" solid className="hidden lg:flex">
            <Plus aria-hidden size={18} strokeWidth={2} />
            Agregar
          </HeaderPillLink>
        }
      />
      <Sheet className="gap-[18px] lg:gap-8">
        <Suspense fallback={<ListSkeleton rows={5} />}>
          <RecurringContent searchParams={searchParams} />
        </Suspense>
      </Sheet>
    </>
  );
}

async function HeaderFigure() {
  const [items, { today }] = await Promise.all([getRecurring(), getProfile()]);
  const s = summarize(items, today);
  return (
    <span className="text-[30px] lg:text-[40px]">
      {money2(s.monthly)}{" "}
      <span className="font-sans text-[15px] font-normal tracking-normal text-on-primary-muted">
        al mes · {s.activeCount === 1 ? "1 cargo" : `${s.activeCount} cargos`}
      </span>
    </span>
  );
}

async function RecurringContent({ searchParams }: { searchParams: PageProps<"/gastos-fijos">["searchParams"] }) {
  const [{ tipo }, items, pending, { today }] = await Promise.all([searchParams, getRecurring(), getPendingCharges(), getProfile()]);
  const filter: Filter = tipo === "suscripciones" || tipo === "fijos" ? tipo : "todos";
  const s = summarize(items, today);
  const subscriptions = items.filter((r) => r.kind === "subscription");
  const fixed = items.filter((r) => r.kind === "fixed");

  return (
    <>
      <div className="hidden gap-3 lg:grid lg:max-w-[880px] lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
        <StatCard label="Suscripciones">{money2(s.subscriptionsMonthly)}</StatCard>
        <StatCard label="Gastos fijos">{money2(s.fixedMonthly)}</StatCard>
        <StatCard label="Al año">{money2({ HNL: s.monthly.HNL * 12, USD: s.monthly.USD * 12 })}</StatCard>
      </div>

      <PendingCharges
        items={pending.map((p) => ({
          id: p.id,
          due_on: p.due_on,
          amount_cents: p.amount_cents,
          name: p.charge.name,
          icon: p.charge.icon,
          color: p.charge.color,
          account: p.charge.account.name,
          currency: p.charge.account.currency,
          is_variable: p.charge.is_variable,
        }))}
      />

      {s.dueSoon.length > 0 && (
        <p className="flex items-center gap-3 rounded-xl border border-warn-line bg-warn-soft px-4 py-3.5 text-sm leading-[1.4] lg:max-w-2xl">
          <CalendarClock aria-hidden size={20} strokeWidth={1.75} className="flex-none text-warn" />
          <span>
            <strong className="font-semibold">
              {s.dueSoon.length === 1 ? "1 cobro en los próximos 7 días" : `${s.dueSoon.length} cobros en los próximos 7 días`}
            </strong>{" "}
            · <span className="font-mono">{money2(s.dueSoonTotal)}</span> en total
          </span>
        </p>
      )}

      {items.length > 0 && (
        <nav aria-label="Filtrar" className="flex gap-1 rounded-xl bg-surface-2 p-1 lg:max-w-md">
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={f.value === "todos" ? "/gastos-fijos" : `/gastos-fijos?tipo=${f.value}`}
              aria-current={filter === f.value ? "page" : undefined}
              scroll={false}
              className={cn(
                "flex h-11 flex-1 items-center justify-center rounded-lg text-sm",
                filter === f.value ? "bg-white font-semibold text-ink ring-1 ring-line-strong hover:text-ink" : "font-medium text-ink-3 hover:text-ink",
              )}
            >
              {f.label}
            </Link>
          ))}
        </nav>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center lg:items-start lg:text-left">
          <span className="text-base font-semibold">Aún no tienes gastos fijos</span>
          <span className="max-w-sm text-sm leading-normal text-ink-3">
            Agrega tus suscripciones y pagos de cada mes para saber cuánto se va antes de empezar a gastar.
          </span>
        </div>
      ) : (
        <>
          {filter !== "fijos" && (
            <RecurringSection title="Suscripciones" monthlyLabel={money2(s.subscriptionsMonthly)} items={subscriptions} today={today} />
          )}
          {filter !== "suscripciones" && (
            <RecurringSection title="Gastos fijos" monthlyLabel={money2(s.fixedMonthly)} items={fixed} today={today} />
          )}
        </>
      )}

      <Link
        href="/gastos-fijos/nuevo"
        className="flex h-[50px] items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-line-strong text-[15px] font-semibold text-ink hover:text-ink lg:hidden"
      >
        <Plus aria-hidden size={18} strokeWidth={2} />
        Agregar suscripción o gasto fijo
      </Link>
    </>
  );
}
