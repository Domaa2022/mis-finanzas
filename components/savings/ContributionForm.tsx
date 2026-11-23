"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Alert } from "@/components/ui/Alert";
import { AccountSelectCard } from "@/components/ui/AccountSelectCard";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Sheet } from "@/components/ui/Sheet";
import { contribute } from "@/lib/actions/savings";
import { formatMoney } from "@/lib/money";
import { contributionSchema, type ContributionInput } from "@/lib/savings/schemas";
import type { ScheduleAccount, ScheduleGoal } from "./ScheduleForm";

export function ContributionForm({
  goals,
  accounts,
  defaultGoalId,
  today,
}: {
  goals: ScheduleGoal[];
  accounts: (ScheduleAccount & { balance_cents: number; is_card: boolean })[];
  defaultGoalId: string | null;
  today: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const goalId = defaultGoalId ?? goals[0]?.value ?? "";
  const currency0 = goals.find((g) => g.value === goalId)?.currency ?? "HNL";
  const initial: Partial<ContributionInput> = {
    goalId,
    accountId: accounts.find((a) => a.currency === currency0)?.value ?? "",
    occurredOn: today,
  };
  const { control, register, handleSubmit, setValue, formState, reset } = useForm<ContributionInput>({
    resolver: zodResolver(contributionSchema),
    defaultValues: initial,
  });
  const v = useWatch({ control });
  const goal = goals.find((g) => g.value === v.goalId);
  const currency = goal?.currency ?? "HNL";
  const accountOptions = accounts.filter((a) => a.currency === currency);
  const account = accounts.find((a) => a.value === v.accountId);
  const insufficient = Boolean(account && !account.is_card && (v.amount ?? 0) > account.balance_cents);

  const onSubmit = handleSubmit((input) =>
    startTransition(async () => {
      setError(null);
      const result = await contribute(input);
      if (!result.ok) return setError(result.error);
      reset(initial);
      router.push("/ahorros");
    }),
  );

  return (
    <Sheet
      as="form"
      noValidate
      onSubmit={onSubmit}
      aria-label="Aportar a una meta"
      footer={
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={pending} aria-busy={pending} className="w-full lg:w-auto lg:px-7">
            {pending ? "Guardando…" : "Aportar"}
          </Button>
          <Link href="/ahorros" className={buttonClasses({ variant: "secondary", className: "hidden font-medium lg:inline-flex" })}>
            Cancelar
          </Link>
        </div>
      }
    >
      <div className="flex max-w-[600px] flex-col gap-[18px] lg:gap-5">
        {error && <Alert title="No pudimos registrar el aporte">{error}</Alert>}
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
                const c = goals.find((g) => g.value === id)?.currency;
                setValue("accountId", accounts.find((a) => a.currency === c)?.value ?? "");
              }}
            />
          )}
        />
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
        <Controller
          control={control}
          name="amount"
          render={({ field, fieldState }) => (
            <div className="flex flex-col items-center gap-1.5 py-2">
              <label htmlFor="monto-aporte" className="text-sm font-medium text-ink-3">
                Monto a aportar
              </label>
              <MoneyInput
                id="monto-aporte"
                ref={field.ref}
                name={field.name}
                onBlur={field.onBlur}
                size="hero"
                currency={currency}
                value={field.value ?? null}
                aria-invalid={fieldState.error || insufficient ? true : undefined}
                aria-describedby="monto-aporte-msg"
                onValueChange={(c) => field.onChange(c ?? undefined)}
              />
              <p id="monto-aporte-msg" className="min-h-5 text-[13px] text-warn" aria-live="polite">
                {fieldState.error?.message ?? (insufficient ? `No hay saldo suficiente en ${account?.label}.` : "")}
              </p>
              {goal && goal.remaining_cents > 0 && (
                <button
                  type="button"
                  onClick={() => setValue("amount", goal.remaining_cents, { shouldValidate: true })}
                  className="h-8 cursor-pointer rounded-full border border-line bg-surface px-3 text-[13px] text-ink-2 hover:border-line-strong"
                >
                  Lo que falta: {formatMoney(goal.remaining_cents, currency)}
                </button>
              )}
            </div>
          )}
        />
        <Field label="Fecha" error={formState.errors.occurredOn?.message}>
          <Input type="date" max={today} {...register("occurredOn")} />
        </Field>
      </div>
    </Sheet>
  );
}
