"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Alert } from "@/components/ui/Alert";
import { AccountSelectCard, type SelectCardOption } from "@/components/ui/AccountSelectCard";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { IconBadge } from "@/components/ui/IconBadge";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { Switch } from "@/components/ui/Switch";
import { createRecurring, deleteRecurring, setRecurringActive, updateRecurring } from "@/lib/actions/recurring";
import { formatMoney } from "@/lib/money";
import {
  biweeklyDays,
  biweeklyRule,
  dayRuleLabel,
  dueSoonLabel,
  firstChargeDate,
  monthlyEquivalent,
  RECURRING_FREQUENCY_LABEL,
  recurringSchema,
  REMINDER_OPTIONS,
  validDayRule,
  yearlyEquivalent,
  type RecurringInput,
} from "@/lib/recurring";
import { WEEKDAYS } from "@/lib/savings/schedule";
import type { CurrencyCode, RecurringFrequency } from "@/lib/supabase/database.types";

export type RecurringAccount = SelectCardOption & { currency: CurrencyCode };
export type RecurringCategory = { id: string; name: string; icon: string; color: string };

const KIND_OPTIONS = [
  { value: "subscription", label: "Suscripción" },
  { value: "fixed", label: "Gasto fijo" },
] as const;

const FREQ_OPTIONS = [
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quincenal" },
  { value: "monthly", label: "Mensual" },
  { value: "yearly", label: "Anual" },
] as const;

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const DEFAULT_RULE: Record<RecurringFrequency, number> = { weekly: 1, biweekly: 1531, monthly: 1, yearly: 101 };

type Props = {
  accounts: RecurringAccount[];
  categories: RecurringCategory[];
  today: string;
} & ({ mode: "create" } | { mode: "edit"; id: string; values: RecurringInput; active: boolean });

export function RecurringForm(props: Props) {
  const { accounts, categories, today } = props;
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const defaults: RecurringInput =
    props.mode === "edit"
      ? props.values
      : {
          kind: "subscription",
          name: "",
          amount: 0,
          isVariable: false,
          accountId: accounts[0]?.value ?? "",
          categoryId: categories.find((c) => c.name === "Entretenimiento")?.id ?? categories[0]?.id ?? "",
          frequency: "monthly",
          dayRule: Number(today.slice(8, 10)),
          remindDaysBefore: 1,
          autoRegister: true,
        };
  const { control, register, handleSubmit, setValue, formState, reset } = useForm<RecurringInput>({
    resolver: zodResolver(recurringSchema),
    defaultValues: { ...defaults, amount: defaults.amount || (undefined as unknown as number) },
  });
  const v = useWatch({ control }) as RecurringInput;
  const account = accounts.find((a) => a.value === v.accountId);
  const currency = account?.currency ?? "HNL";
  const category = categories.find((c) => c.id === v.categoryId);
  const amount = v.amount || 0;
  const ruleOk = validDayRule(v.frequency, v.dayRule);
  const nextDate = ruleOk ? firstChargeDate(v.frequency, v.dayRule, today) : null;

  const onSubmit = handleSubmit((input) =>
    startTransition(async () => {
      setError(null);
      const result = props.mode === "create" ? await createRecurring(input) : await updateRecurring(props.id, input);
      if (!result.ok) return setError(result.error);
      if (props.mode === "create") reset(defaults);
      router.push("/gastos-fijos");
    }),
  );

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) return setError(r.error ?? null);
      router.push("/gastos-fijos");
    });

  if (accounts.length === 0) {
    return (
      <Sheet>
        <div className="flex max-w-md flex-col gap-4">
          <p className="text-[15px] leading-normal text-ink-2">Primero agrega la cuenta o tarjeta de donde se cobra.</p>
          <Link href="/cuentas/nueva" className={buttonClasses({ block: true })}>
            Agregar una cuenta
          </Link>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      as="form"
      noValidate
      onSubmit={onSubmit}
      aria-label={props.mode === "create" ? "Nuevo gasto fijo" : "Editar gasto fijo"}
      footer={
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={pending} aria-busy={pending} className="w-full lg:w-auto lg:px-7">
            {pending ? "Guardando…" : "Guardar"}
          </Button>
          <Link href="/gastos-fijos" className={buttonClasses({ variant: "secondary", className: "hidden font-medium lg:inline-flex" })}>
            Cancelar
          </Link>
        </div>
      }
    >
      <div className="flex flex-wrap items-start gap-12">
        <div className="flex max-w-[600px] min-w-0 flex-[999_1_460px] flex-col gap-[18px] lg:gap-6">
          {error && <Alert title="No pudimos guardar">{error}</Alert>}

          <Controller
            control={control}
            name="kind"
            render={({ field }) => (
              <SegmentedControl
                legend="Tipo"
                options={KIND_OPTIONS}
                value={field.value}
                onChange={(k) => {
                  field.onChange(k);
                  if (props.mode === "create" && !formState.dirtyFields.categoryId) {
                    const name = k === "subscription" ? "Entretenimiento" : "Servicios";
                    const c = categories.find((x) => x.name === name);
                    if (c) setValue("categoryId", c.id);
                  }
                }}
              />
            )}
          />

          <Field label="Nombre" error={formState.errors.name?.message}>
            <Input placeholder="Ej. Streaming, internet, gimnasio" autoComplete="off" {...register("name")} />
          </Field>

          <div className="flex flex-col gap-2.5">
            <Controller
              control={control}
              name="amount"
              render={({ field, fieldState }) => (
                <Field label={v.isVariable ? "Monto estimado" : "Monto"} error={fieldState.error?.message}>
                  <MoneyInput
                    ref={field.ref}
                    name={field.name}
                    onBlur={field.onBlur}
                    currency={currency}
                    value={field.value || null}
                    onValueChange={(c) => field.onChange(c ?? undefined)}
                  />
                </Field>
              )}
            />
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-ink-2">
              <input type="checkbox" className="size-[18px] accent-ink" {...register("isVariable")} />
              El monto cambia cada mes (usar como estimado)
            </label>
          </div>

          <Controller
            control={control}
            name="accountId"
            render={({ field, fieldState }) => (
              <AccountSelectCard label="Se cobra de" options={accounts} value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
            )}
          />

          <Field label="Categoría" hint="Se usa en tus presupuestos y reportes." error={formState.errors.categoryId?.message}>
            <Select {...register("categoryId")} value={v.categoryId} options={categories.map((c) => ({ value: c.id, label: c.name }))} />
          </Field>

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
                  setValue("dayRule", f === "yearly" ? Number(today.slice(5, 7)) * 100 + Number(today.slice(8, 10)) : DEFAULT_RULE[f]);
                }}
              />
            )}
          />

          <DayRuleField frequency={v.frequency} rule={v.dayRule} error={formState.errors.dayRule?.message} onChange={(r) => setValue("dayRule", r, { shouldValidate: true })} />

          <Field label="Recordatorio">
            <Select
              value={v.remindDaysBefore === null ? "none" : String(v.remindDaysBefore)}
              onChange={(e) => setValue("remindDaysBefore", e.target.value === "none" ? null : Number(e.target.value))}
              options={REMINDER_OPTIONS}
            />
          </Field>

          <div className="border-t border-surface-2 pt-2">
            <Controller
              control={control}
              name="autoRegister"
              render={({ field }) => (
                <Switch
                  checked={v.isVariable ? false : field.value}
                  disabled={v.isVariable}
                  onCheckedChange={field.onChange}
                  label={
                    <span className="flex flex-col gap-0.5">
                      <span className="font-medium">Registrar el gasto automáticamente</span>
                      <span className="text-[13px] text-muted">
                        {v.isVariable
                          ? "Como el monto cambia, el día del cobro te preguntamos el monto real."
                          : "El día del cobro se anota solo. Si lo apagas, te preguntamos primero."}
                      </span>
                    </span>
                  }
                />
              )}
            />
          </div>

          {props.mode === "edit" && (
            <div className="flex flex-wrap gap-3 border-t border-surface-2 pt-4">
              <Button variant="secondary" size="md" disabled={pending} onClick={() => act(() => setRecurringActive(props.id, !props.active))}>
                {props.active ? "Pausar cobros" : "Reanudar cobros"}
              </Button>
              <Button
                variant="ghost"
                size="md"
                disabled={pending}
                onClick={() => {
                  if (window.confirm("¿Eliminar este gasto fijo? Los gastos ya registrados se conservan.")) act(() => deleteRecurring(props.id));
                }}
              >
                Eliminar
              </Button>
            </div>
          )}
        </div>

        <aside className="hidden max-w-[360px] min-w-0 flex-[1_1_280px] flex-col gap-3.5 lg:flex">
          <span className="font-mono text-xs tracking-[0.08em] text-muted">VISTA PREVIA</span>
          <div className="flex items-center gap-3 rounded-2xl border border-line p-4">
            <IconBadge name={category?.icon} color={category?.color ?? "#334155"} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[15px] font-semibold">{v.name?.trim() || "Nuevo cargo"}</span>
              <span className="truncate text-[13px] text-ink-3">
                {RECURRING_FREQUENCY_LABEL[v.frequency]} · {ruleOk ? dayRuleLabel(v.frequency, v.dayRule) : "—"} ·{" "}
                {v.isVariable ? "Monto variable" : account?.label}
              </span>
            </span>
            <span className="flex flex-none flex-col items-end gap-1">
              <span className="font-mono text-[15px] font-medium">
                {v.isVariable ? "≈ " : ""}
                {formatMoney(amount, currency)}
              </span>
              {nextDate && dueSoonLabel(nextDate, today) && (
                <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-xs font-semibold text-[#92400E]">{dueSoonLabel(nextDate, today)}</span>
              )}
            </span>
          </div>
          <p className="text-sm leading-normal text-ink-3">
            Sumará <strong className="text-ink">{formatMoney(monthlyEquivalent(v.frequency, amount), currency)}</strong> a tus gastos
            fijos del mes y <strong className="text-ink">{formatMoney(yearlyEquivalent(v.frequency, amount), currency)}</strong> al año.
          </p>
        </aside>
      </div>
    </Sheet>
  );
}

function DayRuleField({
  frequency,
  rule,
  error,
  onChange,
}: {
  frequency: RecurringFrequency;
  rule: number;
  error?: string;
  onChange: (rule: number) => void;
}) {
  if (frequency === "weekly") {
    return (
      <Field label="Día de cobro" error={error}>
        <Select value={String(rule)} onChange={(e) => onChange(Number(e.target.value))} options={WEEKDAYS.map((d, i) => ({ value: String(i + 1), label: `Cada ${d}` }))} />
      </Field>
    );
  }
  if (frequency === "monthly") {
    return (
      <Field label="Día de cobro" error={error}>
        <Select
          value={String(rule)}
          onChange={(e) => onChange(Number(e.target.value))}
          options={[
            ...Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: `Día ${i + 1} de cada mes` })),
            { value: "-1", label: "Último día del mes" },
          ]}
        />
      </Field>
    );
  }
  if (frequency === "biweekly") {
    const [first, second] = biweeklyDays(rule);
    return (
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 p-0 text-sm font-medium">Días de cobro cada mes</legend>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Primer cobro">
            <Select
              value={String(first)}
              onChange={(e) => {
                const f = Number(e.target.value);
                onChange(biweeklyRule(f, second > f ? second : 31));
              }}
              options={Array.from({ length: 30 }, (_, i) => ({ value: String(i + 1), label: `Día ${i + 1}` }))}
            />
          </Field>
          <Field label="Segundo cobro" error={error}>
            <Select
              value={String(second)}
              onChange={(e) => onChange(biweeklyRule(first, Number(e.target.value)))}
              options={[
                ...Array.from({ length: 30 - first }, (_, i) => ({ value: String(first + i + 1), label: `Día ${first + i + 1}` })),
                { value: "31", label: "Último día" },
              ]}
            />
          </Field>
        </div>
      </fieldset>
    );
  }
  const month = Math.floor(rule / 100) || 1;
  const day = rule % 100 || 1;
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-2 p-0 text-sm font-medium">Fecha de cobro cada año</legend>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Día">
          <Select value={String(day)} onChange={(e) => onChange(month * 100 + Number(e.target.value))} options={Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))} />
        </Field>
        <Field label="Mes" error={error}>
          <Select value={String(month)} onChange={(e) => onChange(Number(e.target.value) * 100 + day)} options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} />
        </Field>
      </div>
    </fieldset>
  );
}
