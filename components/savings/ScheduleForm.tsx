"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Alert } from "@/components/ui/Alert";
import { AccountSelectCard, type SelectCardOption } from "@/components/ui/AccountSelectCard";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { Switch } from "@/components/ui/Switch";
import { createSchedule } from "@/lib/actions/savings";
import { shortDate } from "@/lib/dates";
import type { Frequency } from "@/lib/supabase/database.types";
import { formatMoney } from "@/lib/money";
import {
  BIWEEKLY_PRESETS,
  dayRuleLabel,
  formatPercent,
  nextRunDate,
  projectedCompletion,
  runsPerMonth,
  upcomingRuns,
  validDays,
  WEEKDAYS,
} from "@/lib/savings/schedule";
import { scheduleSchema, type ScheduleInput } from "@/lib/savings/schemas";
import type { CurrencyCode } from "@/lib/supabase/database.types";

export type ScheduleGoal = SelectCardOption & { currency: CurrencyCode; remaining_cents: number };
export type ScheduleAccount = SelectCardOption & { currency: CurrencyCode };

const DESTINATION_OPTIONS = [
  { value: "goal", label: "A una meta" },
  { value: "account", label: "A una cuenta" },
] as const;

const MODE_OPTIONS = [
  { value: "fixed", label: "Monto fijo" },
  { value: "percent", label: "Porcentaje" },
] as const;

const FREQ_OPTIONS = [
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quincenal" },
  { value: "monthly", label: "Mensual" },
] as const;

const DEFAULT_DAYS: Record<Frequency, number[]> = { weekly: [5], biweekly: [15, -1], monthly: [-1] };

const DAY_OPTIONS = [
  ...Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: `Día ${i + 1}` })),
  { value: "-1", label: "Último día del mes" },
];

const ENDS = [
  { value: "on_goal", label: "Cuando complete la meta" },
  { value: "on_date", label: "En una fecha" },
  { value: "never", label: "Nunca, hasta que lo pause" },
] as const;

export function ScheduleForm({
  goals,
  accounts,
  defaultGoalId,
  today,
}: {
  goals: ScheduleGoal[];
  accounts: ScheduleAccount[];
  defaultGoalId: string | null;
  today: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [customDays, setCustomDays] = useState(false);
  const [percentText, setPercentText] = useState("");
  const [pending, startTransition] = useTransition();
  const goalId = defaultGoalId ?? goals[0]?.value ?? "";
  const goalCurrency = goals.find((g) => g.value === goalId)?.currency ?? "HNL";
  // Cuentas que pueden recibir el ahorro: todas menos las tarjetas de crédito.
  const savingsAccounts = accounts.filter((a) => a.accountType !== "credit_card");
  const startWithAccount = goals.length === 0;
  const firstSavings = savingsAccounts.find((a) => a.accountType === "savings") ?? savingsAccounts[0];
  const sourceFor = (currency: CurrencyCode, exclude?: string) =>
    accounts.find((a) => a.currency === currency && a.value !== exclude)?.value ?? "";
  const initial: ScheduleInput = {
    destination: startWithAccount ? "account" : "goal",
    goalId,
    toAccountId: startWithAccount ? (firstSavings?.value ?? "") : "",
    accountId: startWithAccount
      ? sourceFor(firstSavings?.currency ?? "HNL", firstSavings?.value)
      : sourceFor(goalCurrency),
    mode: "fixed",
    amount: null,
    percent: null,
    frequency: "biweekly",
    days: DEFAULT_DAYS.biweekly,
    ends: startWithAccount ? "never" : "on_goal",
    endDate: "",
    waitForIncome: true,
  };
  const { control, register, handleSubmit, setValue, formState, reset } = useForm<ScheduleInput>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: initial,
  });
  const v = useWatch({ control }) as ScheduleInput;
  const toGoal = v.destination === "goal";
  const goal = toGoal ? goals.find((g) => g.value === v.goalId) : undefined;
  const toAccount = toGoal ? undefined : savingsAccounts.find((a) => a.value === v.toAccountId);
  const currency = (toGoal ? goal?.currency : toAccount?.currency) ?? "HNL";
  const accountOptions = accounts.filter((a) => a.currency === currency && a.value !== v.toAccountId);
  const daysOk = validDays(v.frequency, v.days ?? []);
  const runs = daysOk ? upcomingRuns(v.frequency, v.days, nextRunDate(v.frequency, v.days, today), 3) : [];
  const eta =
    v.mode === "fixed" && v.amount && goal && runs[0]
      ? projectedCompletion(v.frequency, v.days, runs[0], v.amount, goal.remaining_cents)
      : null;

  const onSubmit = handleSubmit((input) =>
    startTransition(async () => {
      setError(null);
      const result = await createSchedule(input);
      if (!result.ok) return setError(result.error);
      reset(initial);
      setPercentText("");
      router.push("/ahorros");
    }),
  );

  const biweeklyPreset = BIWEEKLY_PRESETS.findIndex((p) => p.days[0] === v.days?.[0] && p.days[1] === v.days?.[1]);

  return (
    <Sheet
      as="form"
      noValidate
      onSubmit={onSubmit}
      aria-label="Programar ahorro"
      footer={
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={pending} aria-busy={pending} className="w-full lg:w-auto lg:px-7">
            {pending ? "Guardando…" : "Programar ahorro"}
          </Button>
          <Link href="/ahorros" className={buttonClasses({ variant: "secondary", className: "hidden font-medium lg:inline-flex" })}>
            Cancelar
          </Link>
        </div>
      }
    >
      <div className="flex flex-wrap items-start gap-x-12 gap-y-6">
        <div className="flex max-w-[600px] min-w-0 flex-[999_1_460px] flex-col gap-[18px] lg:gap-6">
          {error && <Alert title="No pudimos programar el ahorro">{error}</Alert>}

          <Controller
            control={control}
            name="destination"
            render={({ field }) => (
              <SegmentedControl
                legend="¿A dónde va el ahorro?"
                options={DESTINATION_OPTIONS}
                value={field.value}
                onChange={(d) => {
                  field.onChange(d);
                  if (d === "account") {
                    const to = v.toAccountId || firstSavings?.value || "";
                    const c = savingsAccounts.find((a) => a.value === to)?.currency ?? "HNL";
                    setValue("toAccountId", to);
                    setValue("accountId", sourceFor(c, to));
                    if (v.ends === "on_goal") setValue("ends", "never");
                  } else {
                    setValue("goalId", v.goalId || goals[0]?.value || "");
                    setValue("accountId", sourceFor(goals.find((g) => g.value === (v.goalId || goals[0]?.value))?.currency ?? "HNL"));
                    setValue("ends", "on_goal");
                  }
                }}
              />
            )}
          />

          {toGoal ? (
            goals.length > 0 ? (
              <Controller
                control={control}
                name="goalId"
                render={({ field, fieldState }) => (
                  <AccountSelectCard
                    label="Meta"
                    options={goals}
                    value={field.value}
                    error={fieldState.error?.message}
                    onChange={(id) => {
                      field.onChange(id);
                      setValue("accountId", sourceFor(goals.find((g) => g.value === id)?.currency ?? "HNL"));
                    }}
                  />
                )}
              />
            ) : (
              <p className="text-[15px] leading-normal text-ink-2">
                Aún no tienes metas.{" "}
                <Link href="/ahorros/nueva-meta" className="font-semibold">
                  Crea una meta
                </Link>{" "}
                o aparta el ahorro directo a una cuenta.
              </p>
            )
          ) : (
            <Controller
              control={control}
              name="toAccountId"
              render={({ field, fieldState }) => (
                <AccountSelectCard
                  label="A la cuenta"
                  options={savingsAccounts}
                  value={field.value}
                  error={fieldState.error?.message}
                  placeholder="Agrega una cuenta de ahorro"
                  onChange={(id) => {
                    field.onChange(id);
                    const c = savingsAccounts.find((a) => a.value === id)?.currency ?? "HNL";
                    if (v.accountId === id || accounts.find((a) => a.value === v.accountId)?.currency !== c) {
                      setValue("accountId", sourceFor(c, id));
                    }
                  }}
                />
              )}
            />
          )}
          <Controller
            control={control}
            name="accountId"
            render={({ field, fieldState }) => (
              <AccountSelectCard
                label="Desde la cuenta"
                options={accountOptions}
                value={field.value}
                onChange={field.onChange}
                placeholder={`No tienes cuentas en ${currency === "USD" ? "dólares" : "lempiras"}`}
                error={fieldState.error?.message}
              />
            )}
          />

          <div className="flex flex-col gap-2">
            <Controller
              control={control}
              name="mode"
              render={({ field }) => (
                <SegmentedControl legend="Cuánto apartar" options={MODE_OPTIONS} value={field.value} onChange={field.onChange} />
              )}
            />
            {v.mode === "fixed" ? (
              <Controller
                control={control}
                name="amount"
                render={({ field, fieldState }) => (
                  <Field label="Monto de cada aporte" hint="Siempre se aparta la misma cantidad." error={fieldState.error?.message} className="mt-1">
                    <MoneyInput
                      ref={field.ref}
                      name={field.name}
                      onBlur={field.onBlur}
                      currency={currency}
                      value={field.value ?? null}
                      onValueChange={field.onChange}
                    />
                  </Field>
                )}
              />
            ) : (
              <Field
                label="Porcentaje de tus ingresos"
                hint="Se calcula sobre los ingresos que entren a la cuenta desde el aporte anterior. Si no hubo ingresos, no se aparta nada."
                error={formState.errors.percent?.message}
                className="mt-1"
              >
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <Input
                      inputMode="decimal"
                      placeholder="10"
                      className="pr-10 font-mono"
                      value={percentText}
                      onChange={(e) => {
                        const text = e.target.value.replace(/[^\d.]/g, "");
                        setPercentText(text);
                        const n = Number(text);
                        setValue("percent", text && Number.isFinite(n) ? Math.round(n * 100) / 100 : null, {
                          shouldValidate: formState.isSubmitted,
                        });
                      }}
                    />
                    <span aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 font-mono text-ink-3">
                      %
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[5, 10, 20].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setPercentText(String(p));
                          setValue("percent", p, { shouldValidate: formState.isSubmitted });
                        }}
                        className="h-8 cursor-pointer rounded-full border border-line bg-surface px-3 font-mono text-[13px] text-ink-2 hover:border-line-strong"
                      >
                        {p} %
                      </button>
                    ))}
                  </div>
                </div>
              </Field>
            )}
          </div>

          <Controller
            control={control}
            name="frequency"
            render={({ field }) => (
              <SegmentedControl
                legend="Frecuencia"
                options={FREQ_OPTIONS}
                value={field.value}
                onChange={(f) => {
                  field.onChange(f);
                  setValue("days", DEFAULT_DAYS[f]);
                  setCustomDays(false);
                }}
              />
            )}
          />

          <DaysField
            frequency={v.frequency}
            days={v.days ?? []}
            custom={customDays}
            presetIndex={biweeklyPreset}
            error={formState.errors.days?.message}
            onCustom={setCustomDays}
            onDays={(d) => setValue("days", d, { shouldValidate: formState.isSubmitted })}
          />

          <Controller
            control={control}
            name="waitForIncome"
            render={({ field }) => (
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                label={
                  <span className="flex flex-col gap-0.5">
                    <span className="font-medium">Esperar a que entre mi ingreso</span>
                    <span className="text-[13px] leading-normal text-muted">
                      Aparta solo después de que registres un ingreso en la cuenta de origen. Si no entra antes del
                      siguiente aporte, ese se omite y te avisamos.
                    </span>
                  </span>
                }
              />
            )}
          />

          <fieldset className="m-0 flex flex-col border-0 p-0">
            <legend className="mb-2 p-0 text-sm font-medium">Termina</legend>
            {ENDS.filter((e) => toGoal || e.value !== "on_goal").map((e) => (
              <label key={e.value} className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
                <input type="radio" value={e.value} className="size-5 accent-ink" {...register("ends")} />
                {e.label}
              </label>
            ))}
            {v.ends === "on_date" && (
              <Field label="Fecha final" error={formState.errors.endDate?.message} className="mt-2 max-w-xs">
                <Input type="date" min={today} {...register("endDate")} />
              </Field>
            )}
          </fieldset>

          <p className="flex items-start gap-2.5 rounded-[10px] bg-surface-2 px-3.5 py-3 text-[13px] leading-[1.45] text-ink-2">
            <Bell aria-hidden size={18} strokeWidth={2} className="mt-px flex-none text-ink-3" />
            Te avisamos un día antes de cada aporte. Si la cuenta no tiene saldo suficiente, ese aporte se omite y te
            notificamos.
          </p>
        </div>

        <aside className="flex w-full max-w-[380px] min-w-0 flex-[1_1_300px] flex-col gap-3.5">
          <span className="font-mono text-xs tracking-[0.08em] text-muted">RESUMEN</span>
          <div className="flex flex-col gap-4 rounded-2xl border border-line p-5">
            {v.mode === "fixed" ? (
              <div className="flex flex-col gap-1">
                <span className="text-sm text-ink-3">{v.frequency === "weekly" ? "Apartarás al mes (aprox.)" : "Apartarás al mes"}</span>
                <Money cents={(v.amount ?? 0) * runsPerMonth(v.frequency)} currency={currency} className="text-[26px]" />
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-sm text-ink-3">Apartarás</span>
                <span className="font-mono text-[26px] font-medium">{formatPercent(v.percent ?? 0)} %</span>
                <span className="text-[13px] text-ink-3">de cada ingreso. El monto cambia según lo que ganes.</span>
              </div>
            )}
            <div className="flex flex-col">
              <span className="pb-1 text-sm font-semibold">Próximos aportes</span>
              <ul className="m-0 list-none p-0">
                {runs.map((d) => (
                  <li key={d} className="flex justify-between gap-4 border-t border-surface-2 py-3 text-sm">
                    <span>{capitalize(shortDate(d))} {d.slice(0, 4)}</span>
                    <span className="font-mono font-medium">
                      {v.mode === "fixed" ? formatMoney(v.amount ?? 0, currency) : `${formatPercent(v.percent ?? 0)} %`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {goal && eta && (
              <p className="text-[13px] leading-normal text-ink-3">
                Con este ritmo llegarías a tu meta de <strong className="text-ink">{goal.label}</strong> el{" "}
                <strong className="text-ink">{shortDate(eta)} {eta.slice(0, 4)}</strong>.
              </p>
            )}
          </div>
        </aside>
      </div>
    </Sheet>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function DaysField({
  frequency,
  days,
  custom,
  presetIndex,
  error,
  onCustom,
  onDays,
}: {
  frequency: Frequency;
  days: number[];
  custom: boolean;
  presetIndex: number;
  error?: string;
  onCustom: (v: boolean) => void;
  onDays: (d: number[]) => void;
}) {
  if (frequency === "weekly") {
    return (
      <Field label="Día del aporte" hint="Elige un día cercano a tu pago para que siempre haya saldo." error={error}>
        <Select
          value={String(days[0] ?? 5)}
          onChange={(e) => onDays([Number(e.target.value)])}
          options={WEEKDAYS.map((d, i) => ({ value: String(i + 1), label: `Cada ${d}` }))}
        />
      </Field>
    );
  }
  if (frequency === "monthly") {
    return (
      <Field label="Día del aporte" hint="Elige un día cercano a tu pago para que siempre haya saldo." error={error}>
        <Select value={String(days[0] ?? -1)} onChange={(e) => onDays([Number(e.target.value)])} options={DAY_OPTIONS} />
      </Field>
    );
  }
  const showCustom = custom || presetIndex === -1;
  return (
    <div className="flex flex-col gap-3">
      <Field label="Días del aporte" hint="Elige días cercanos a tu pago para que siempre haya saldo." error={error}>
        <Select
          value={showCustom ? "custom" : String(presetIndex)}
          onChange={(e) => {
            if (e.target.value === "custom") return onCustom(true);
            onCustom(false);
            onDays([...BIWEEKLY_PRESETS[Number(e.target.value)].days]);
          }}
          options={[
            ...BIWEEKLY_PRESETS.map((p, i) => ({ value: String(i), label: p.label })),
            { value: "custom", label: "Elegir otros días" },
          ]}
        />
      </Field>
      {showCustom && (
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <Field key={i} label={i === 0 ? "Primer día" : "Segundo día"}>
              <Select
                value={String(days[i] ?? (i === 0 ? 15 : -1))}
                onChange={(e) => {
                  const next = [...days];
                  next[i] = Number(e.target.value);
                  onDays(next);
                }}
                options={DAY_OPTIONS}
              />
            </Field>
          ))}
          <p className="col-span-2 text-[13px] text-muted">
            Aportes el {dayRuleLabel(days[0] ?? 15)} y el {dayRuleLabel(days[1] ?? -1)}.
          </p>
        </div>
      )}
    </div>
  );
}
