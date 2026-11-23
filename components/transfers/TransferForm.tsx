"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpDown, Info } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Alert } from "@/components/ui/Alert";
import { AccountSelectCard } from "@/components/ui/AccountSelectCard";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Sheet } from "@/components/ui/Sheet";
import { ACCOUNT_TYPE_META, type AccountType } from "@/lib/accounts/meta";
import { createTransfer } from "@/lib/actions/transfers";
import { formatMoney } from "@/lib/money";
import type { CurrencyCode } from "@/lib/supabase/database.types";
import { convertCents, parseRate, transferSchema, type TransferInput } from "@/lib/transfers";

export type TransferAccount = {
  id: string;
  name: string;
  type: AccountType;
  bank: string;
  currency: CurrencyCode;
  color: string;
  balance_cents: number;
};

export function TransferForm({
  accounts,
  defaultFrom,
  today,
}: {
  accounts: TransferAccount[];
  defaultFrom: string | null;
  today: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [rateText, setRateText] = useState("");
  const [pending, startTransition] = useTransition();
  const fromDefault = defaultFrom ?? accounts[0]?.id ?? "";
  const initial: Partial<TransferInput> = {
    fromAccountId: fromDefault,
    toAccountId: accounts.find((a) => a.id !== fromDefault)?.id ?? "",
    exchangeRate: null,
    occurredOn: today,
    note: "",
  };
  const { control, register, handleSubmit, formState, setValue, reset, getValues } = useForm<TransferInput>({
    resolver: zodResolver(transferSchema),
    defaultValues: initial,
  });
  const v = useWatch({ control });
  const from = accounts.find((a) => a.id === v.fromAccountId);
  const to = accounts.find((a) => a.id === v.toAccountId);
  const needsRate = Boolean(from && to && from.currency !== to.currency);
  const amount = v.amount ?? 0;
  let toAmount: number | null = null;
  if (from && to) {
    if (!needsRate) toAmount = amount;
    else if (v.exchangeRate) toAmount = convertCents(amount, from.currency, to.currency, v.exchangeRate);
  }
  const insufficient = Boolean(from && from.type !== "credit_card" && amount > from.balance_cents);

  const options = accounts.map((a) => ({
    value: a.id,
    label: a.name,
    subtitle: `${a.bank} · Disponible ${formatMoney(a.balance_cents, a.currency)}`,
    color: a.color,
    icon: ACCOUNT_TYPE_META[a.type].icon,
  }));

  const onSubmit = handleSubmit((input) =>
    startTransition(async () => {
      setError(null);
      if (needsRate && !input.exchangeRate) {
        setError("Escribe la tasa de cambio.");
        return;
      }
      const result = await createTransfer({ ...input, exchangeRate: needsRate ? input.exchangeRate : null });
      if (!result.ok) return setError(result.error);
      reset(initial);
      setRateText("");
      router.push("/cuentas");
    }),
  );

  if (accounts.length < 2) {
    return (
      <Sheet>
        <div className="flex max-w-md flex-col gap-4">
          <p className="text-[15px] leading-normal text-ink-2">Necesitas al menos dos cuentas para transferir entre ellas.</p>
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
      aria-label="Transferir entre cuentas"
      footer={
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={pending} aria-busy={pending} className="w-full lg:w-auto lg:px-8">
            {pending ? "Transfiriendo…" : "Transferir"}
          </Button>
          <Link href="/cuentas" className={buttonClasses({ variant: "secondary", className: "hidden font-medium lg:inline-flex" })}>
            Cancelar
          </Link>
        </div>
      }
    >
      <div className="flex flex-wrap items-start gap-12">
        <div className="flex max-w-[600px] min-w-0 flex-[999_1_460px] flex-col gap-[18px] lg:gap-5">
          {error && <Alert title="No pudimos transferir">{error}</Alert>}

          <Controller
            control={control}
            name="fromAccountId"
            render={({ field, fieldState }) => (
              <AccountSelectCard label="Desde" options={options} value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
            )}
          />
          <div className="-my-2.5 flex justify-center">
            <button
              type="button"
              aria-label="Intercambiar cuentas"
              onClick={() => {
                const { fromAccountId, toAccountId } = getValues();
                setValue("fromAccountId", toAccountId);
                setValue("toAccountId", fromAccountId);
              }}
              className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-line-strong bg-white text-ink hover:bg-surface"
            >
              <ArrowUpDown aria-hidden size={20} strokeWidth={1.75} />
            </button>
          </div>
          <Controller
            control={control}
            name="toAccountId"
            render={({ field, fieldState }) => (
              <AccountSelectCard label="Hacia" options={options} value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
            )}
          />

          <Controller
            control={control}
            name="amount"
            render={({ field, fieldState }) => (
              <div className="flex flex-col items-center gap-1.5 py-2">
                <label htmlFor="monto-transferir" className="text-sm font-medium text-ink-3">
                  Monto a transferir
                </label>
                <MoneyInput
                  id="monto-transferir"
                  ref={field.ref}
                  name={field.name}
                  onBlur={field.onBlur}
                  size="hero"
                  currency={from?.currency ?? "HNL"}
                  value={field.value ?? null}
                  aria-invalid={fieldState.error || insufficient ? true : undefined}
                  aria-describedby="monto-transferir-msg"
                  onValueChange={(c) => field.onChange(c ?? undefined)}
                />
                <p id="monto-transferir-msg" className="min-h-5 text-[13px] text-warn" aria-live="polite">
                  {fieldState.error?.message ??
                    (insufficient ? `No hay saldo suficiente en ${from?.name}.` : "")}
                </p>
                {from && from.balance_cents > 0 && (
                  <button
                    type="button"
                    onClick={() => setValue("amount", from.balance_cents, { shouldValidate: true })}
                    className="h-8 cursor-pointer rounded-full border border-line bg-surface px-3 text-[13px] text-ink-2 hover:border-line-strong"
                  >
                    Todo el saldo
                  </button>
                )}
              </div>
            )}
          />

          {needsRate && from && to && (
            <div className="grid gap-5 rounded-xl bg-surface p-4 lg:grid-cols-2">
              <Field label="Tasa de cambio" hint="Lempiras por 1 dólar, según tu banco." error={formState.errors.exchangeRate?.message}>
                <Input
                  inputMode="decimal"
                  placeholder="24.65"
                  className="font-mono"
                  value={rateText}
                  onChange={(e) => {
                    setRateText(e.target.value);
                    setValue("exchangeRate", parseRate(e.target.value), { shouldValidate: formState.isSubmitted });
                  }}
                />
              </Field>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Llegan a {to.name}</span>
                <span className="flex h-[50px] items-center">
                  {toAmount !== null ? (
                    <Money cents={toAmount} currency={to.currency} className="text-xl" />
                  ) : (
                    <span className="text-sm text-muted">Escribe la tasa para calcularlo</span>
                  )}
                </span>
              </div>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] lg:gap-5">
            <Field label="Fecha" error={formState.errors.occurredOn?.message}>
              <Input type="date" max={today} {...register("occurredOn")} />
            </Field>
            <Field
              label={
                <>
                  Nota <span className="font-normal text-muted">(opcional)</span>
                </>
              }
              error={formState.errors.note?.message}
            >
              <Input placeholder="Ej. Ahorro de la quincena" {...register("note")} />
            </Field>
          </div>

          <p className="flex items-start gap-2.5 rounded-[10px] bg-surface-2 px-3.5 py-3 text-[13px] leading-[1.45] text-ink-2">
            <Info aria-hidden size={18} strokeWidth={2} className="mt-px flex-none text-ink-3" />
            Las transferencias entre tus cuentas no se cuentan como gasto ni como ingreso.
          </p>
        </div>

        <aside className="hidden max-w-[380px] min-w-0 flex-[1_1_300px] flex-col gap-3.5 lg:flex">
          <span className="font-mono text-xs tracking-[0.08em] text-muted">RESUMEN</span>
          <div className="flex flex-col rounded-2xl border border-line px-5 pt-2 pb-3 text-sm">
            <div className="py-3 text-ink-3">Saldos después de transferir</div>
            {from && (
              <SummaryRow label={from.name}>
                {formatMoney(from.balance_cents, from.currency)} → {formatMoney(from.balance_cents - amount, from.currency)}
              </SummaryRow>
            )}
            {to && (
              <SummaryRow label={to.name}>
                {formatMoney(to.balance_cents, to.currency)} →{" "}
                {toAmount !== null ? formatMoney(to.balance_cents + toAmount, to.currency) : "—"}
              </SummaryRow>
            )}
            <div className="flex justify-between gap-4 border-t border-surface-2 py-3">
              <span className="text-ink-3">Gastos del mes</span>
              <span className="font-medium">Sin cambio</span>
            </div>
          </div>
        </aside>
      </div>
    </Sheet>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-t border-surface-2 py-3">
      <span className="truncate text-ink-3">{label}</span>
      <span className="font-mono font-medium whitespace-nowrap">{children}</span>
    </div>
  );
}
