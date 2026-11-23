import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { Suspense } from "react";
import { ListSkeleton, StatsSkeleton } from "@/components/skeletons/Skeletons";
import { Money } from "@/components/ui/Money";
import { MonthNav } from "@/components/ui/MonthNav";
import { HeaderPillLink, PageHeader } from "@/components/ui/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Sheet } from "@/components/ui/Sheet";
import { StatCard } from "@/components/ui/StatCard";
import { cn } from "@/lib/cn";
import { getBudgets, getReport, resolveMonth } from "@/lib/data/reports";
import { addMonths, daysLeftInMonth, monthParam } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { changeVsPrevious, usedPercent } from "@/lib/reports";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { BudgetList } from "./BudgetList";
import { CategoryDonut, CategoryLegend, CategoryStack, MonthBars } from "./Charts";
import { CopyBudgetsButton } from "./CopyBudgetsButton";

type View = "presupuestos" | "reportes";
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const monthName = (d: string) => format(parseISO(d), "MMMM", { locale: es });

/** Presupuestos y reportes. Móvil: una pestaña por ruta. Web: todo junto (`Web-reportes`). */
export function ReportsScreen({ view, searchParams }: { view: View; searchParams: SearchParams }) {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title={view === "presupuestos" ? "Presupuestos" : "Reportes"} />
          <Sheet>
            <StatsSkeleton count={3} />
            <ListSkeleton rows={5} />
          </Sheet>
        </>
      }
    >
      <Content view={view} searchParams={searchParams} />
    </Suspense>
  );
}

function daysLeftText(month: string, current: string, today: string) {
  if (month !== current) return "Mes cerrado";
  const n = daysLeftInMonth(today);
  return n === 1 ? `Queda 1 día de ${monthName(month)}` : `Quedan ${n} días de ${monthName(month)}`;
}

async function Content({ view, searchParams }: { view: View; searchParams: SearchParams }) {
  const { mes } = await searchParams;
  const { month, current, today } = await resolveMonth(mes);
  const [budgets, report] = await Promise.all([getBudgets(month), getReport(month)]);
  const mp = monthParam(month);
  const isCurrent = month === current;
  const limitTotal = budgets.reduce((s, b) => s + b.limit, 0);
  const spentTotal = budgets.reduce((s, b) => s + b.spent, 0);
  const change = changeVsPrevious(report.expenses, report.previousExpenses);
  const changeText = change
    ? change.direction === "same"
      ? `Igual que en ${monthName(addMonths(month, -1))}`
      : `${change.percent} % ${change.direction === "less" ? "menos" : "más"} que en ${monthName(addMonths(month, -1))}`
    : null;
  const daysText = daysLeftText(month, current, today);

  const tabs = (
    <nav aria-label="Secciones" className="flex gap-1 rounded-xl bg-surface-2 p-1 lg:hidden">
      {(["presupuestos", "reportes"] as const).map((v) => (
        <Link
          key={v}
          href={`/${v}${isCurrent ? "" : `?mes=${mp}`}`}
          aria-current={view === v ? "page" : undefined}
          className={cn(
            "flex h-11 flex-1 items-center justify-center rounded-lg text-sm",
            view === v ? "bg-white font-semibold text-ink ring-1 ring-line-strong hover:text-ink" : "font-medium text-ink-3 hover:text-ink",
          )}
        >
          {v === "presupuestos" ? "Presupuestos" : "Reportes"}
        </Link>
      ))}
    </nav>
  );

  const monthNav = <MonthNav month={month} currentMonth={current} basePath={`/${view}`} className="-mr-2 lg:mr-0" />;

  return (
    <>
      <PageHeader
        title={
          <>
            <span className="lg:hidden">{view === "presupuestos" ? "Presupuestos" : "Reportes"}</span>
            <span className="hidden lg:inline">Reportes y presupuestos</span>
          </>
        }
        subtitle={<span className="hidden lg:inline">{daysText}</span>}
        actions={
          <>
            {monthNav}
            <HeaderPillLink href={`/reportes/exportar?mes=${mp}`} className="hidden lg:flex">
              <Download aria-hidden size={18} strokeWidth={1.75} />
              Exportar
            </HeaderPillLink>
          </>
        }
      >
        {view === "presupuestos" ? (
          <div className="flex flex-col gap-2 lg:hidden">
            <span className="text-sm text-on-primary-muted">Disponible este mes</span>
            <span className="font-mono text-[30px] font-medium tracking-[-0.02em]">
              {formatMoney(Math.max(0, limitTotal - spentTotal), "HNL")}{" "}
              <span className="font-sans text-[15px] font-normal tracking-normal text-on-primary-muted">
                de {formatMoney(limitTotal, "HNL")}
              </span>
            </span>
            <ProgressBar
              variant="on-primary"
              className="mt-1"
              value={spentTotal}
              max={Math.max(1, limitTotal)}
              label="Presupuesto total usado"
            />
            <div className="flex justify-between text-[13px] text-on-primary-muted">
              <span>Usado {usedPercent(spentTotal, limitTotal)} %</span>
              <span>{isCurrent ? daysText.replace(/ de \S+$/, "") : daysText}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 lg:hidden">
            <span className="text-sm text-on-primary-muted">{isCurrent ? "Gastaste este mes" : `Gastaste en ${monthName(month)}`}</span>
            <Money cents={report.expenses} currency="HNL" className="text-[30px] tracking-[-0.02em]" />
            {changeText && <span className="text-[13px] text-on-primary-muted">{changeText}</span>}
          </div>
        )}
      </PageHeader>

      <Sheet className="gap-5 lg:gap-8">
        {tabs}

        <div className={cn("grid grid-cols-2 gap-2.5 lg:grid lg:max-w-[880px] lg:grid-cols-3 lg:gap-3", view === "presupuestos" && "hidden")}>
          <StatCard label="Ingresos">
            <Money cents={report.income} currency="HNL" />
          </StatCard>
          <StatCard label="Gastos">
            <Money cents={report.expenses} currency="HNL" />
            {changeText && <span className="hidden font-sans text-[13px] font-normal text-ink-3 lg:block">{changeText}</span>}
          </StatCard>
          <StatCard label="Ahorrado" className="hidden lg:flex">
            <Money cents={report.saved} currency="HNL" />
          </StatCard>
        </div>

        <div className="flex flex-wrap items-start gap-8">
          <section
            aria-labelledby="titulo-presupuestos"
            className={cn("min-w-0 flex-[1_1_420px] flex-col gap-2 lg:flex", view === "presupuestos" ? "flex" : "hidden")}
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="titulo-presupuestos" className="text-[17px] font-semibold tracking-[-0.01em] lg:text-lg">
                <span className="lg:hidden">Por categoría</span>
                <span className="hidden lg:inline">Presupuestos por categoría</span>
              </h2>
              <Link href={`/presupuestos/nuevo?mes=${mp}`} className="hidden text-sm font-semibold lg:inline">
                Nuevo presupuesto
              </Link>
            </div>
            {budgets.length > 0 ? (
              <BudgetList budgets={budgets} monthParam={mp} />
            ) : (
              <div className="flex flex-col items-start gap-3 py-4">
                <p className="text-sm leading-normal text-ink-3">
                  Aún no tienes presupuestos para {monthName(month)}. Ponle un límite a cada categoría y te avisamos cuando te
                  acerques.
                </p>
                <CopyBudgetsButton month={month} />
              </div>
            )}
            <Link
              href={`/presupuestos/nuevo?mes=${mp}`}
              className="mt-2 flex h-[50px] items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-line-strong text-[15px] font-semibold text-ink hover:text-ink lg:hidden"
            >
              <Plus aria-hidden size={18} strokeWidth={2} />
              Nuevo presupuesto
            </Link>
            <p className="text-[13px] text-muted">Las transferencias entre tus cuentas no cuentan en los presupuestos.</p>
          </section>

          <div className={cn("min-w-0 flex-[1_1_420px] flex-col gap-5 lg:flex lg:gap-6", view === "reportes" ? "flex" : "hidden")}>
            <section className="flex flex-col gap-2.5 lg:gap-3 lg:rounded-2xl lg:border lg:border-line lg:p-5">
              <div className="flex items-baseline justify-between">
                <h2 className="text-[17px] font-semibold tracking-[-0.01em] lg:text-lg">
                  <span className="lg:hidden">Últimos 6 meses</span>
                  <span className="hidden lg:inline">Gasto mensual</span>
                </h2>
                <span className="hidden text-[13px] text-ink-3 lg:inline">Últimos 6 meses</span>
              </div>
              <MonthBars series={report.series} highlight={month} />
            </section>

            <section className="flex flex-col gap-3 lg:gap-4 lg:rounded-2xl lg:border lg:border-line lg:p-5">
              <h2 className="text-[17px] font-semibold tracking-[-0.01em] lg:text-lg">
                <span className="lg:hidden">Por categoría</span>
                <span className="hidden lg:inline">En qué se fue el dinero</span>
              </h2>
              {report.byCategory.total > 0 ? (
                <>
                  <div className="lg:hidden">
                    <CategoryStack items={report.byCategory.items} />
                  </div>
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="hidden lg:block">
                      <CategoryDonut items={report.byCategory.items} total={report.byCategory.total} />
                    </div>
                    <div className="min-w-0 flex-[1_1_220px]">
                      <CategoryLegend items={report.byCategory.items} />
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-ink-3">No hay gastos en {monthName(month)}.</p>
              )}
              {report.usdExpenses > 0 && (
                <p className="text-[13px] text-muted">
                  Montos en lempiras. Además gastaste {formatMoney(report.usdExpenses, "USD")} en cuentas en dólares.
                </p>
              )}
            </section>

            <Link
              href={`/reportes/exportar?mes=${mp}`}
              className="flex h-[50px] items-center justify-center gap-2 rounded-xl border border-line-strong text-[15px] font-semibold text-ink hover:text-ink lg:hidden"
            >
              <Download aria-hidden size={18} strokeWidth={1.75} />
              Exportar a CSV
            </Link>
          </div>
        </div>
      </Sheet>
    </>
  );
}
