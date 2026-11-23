"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonClasses } from "@/components/ui/Button";
import { CategoryPicker, type PickerCategory } from "@/components/ui/CategoryPicker";
import { Field, Input } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { createTransaction } from "@/lib/actions/transactions";
import { formatMoney } from "@/lib/money";
import type { CurrencyCode } from "@/lib/supabase/database.types";
import { transactionSchema, type TransactionInput } from "@/lib/transactions/schema";

export type FormAccount = { id: string; name: string; currency: CurrencyCode; balance_cents: number };

const KIND_OPTIONS = [
  { value: "expense", label: "Gasto" },
  { value: "income", label: "Ingreso" },
] as const;

type Props = {
  accounts: FormAccount[];
  expenseCategories: PickerCategory[];
  incomeCategories: PickerCategory[];
  defaultAccountId: string | null;
  defaultKind: "expense" | "income";
  today: string;
  returnTo: string;
};

export function TransactionForm({
  accounts,
  expenseCategories,
  incomeCategories,
  defaultAccountId,
  defaultKind,
  today,
  returnTo,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const initial: Partial<TransactionInput> = {
    kind: defaultKind,
    categoryId: "",
    accountId: defaultAccountId ?? accounts[0]?.id ?? "",
    occurredOn: today,
    note: "",
  };
  const { control, register, handleSubmit, formState, reset, setValue } = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: initial,
  });
  const values = useWatch({ control });
  const kind = values.kind ?? "expense";
  const account = accounts.find((a) => a.id === values.accountId);
  const currency = account?.currency ?? "HNL";
  const categories = kind === "expense" ? expenseCategories : incomeCategories;
  const category = categories.find((c) => c.id === values.categoryId);
  const amount = values.amount ?? 0;
  const newBalance = account ? account.balance_cents + (kind === "income" ? amount : -amount) : null;
  const noun = kind === "expense" ? "gasto" : "ingreso";

  const onSubmit = handleSubmit((input) =>
    startTransition(async () => {
      setError(null);
      const result = await createTransaction(input);
      if (!result.ok) return setError(result.error);
      reset({ ...initial, accountId: input.accountId, kind: input.kind });
      router.push(returnTo);
    }),
  );

  if (accounts.length === 0) {
    return (
      <Sheet>
        <div className="flex max-w-md flex-col gap-4">
          <p className="text-[15px] leading-normal text-ink-2">
            Para registrar un gasto primero necesitas una cuenta: de ahí sale el dinero.
          </p>
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
      aria-label={kind === "expense" ? "Registrar gasto" : "Registrar ingreso"}
      footer={
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={pending} aria-busy={pending} className="w-full lg:w-auto lg:px-7">
            {pending ? "Guardando…" : `Guardar ${noun}`}
          </Button>
          <Link href={returnTo} className={buttonClasses({ variant: "secondary", className: "hidden font-medium lg:inline-flex" })}>
            Cancelar
          </Link>
        </div>
      }
    >
      <div className="flex flex-wrap items-start gap-12">
        <div className="flex max-w-[640px] min-w-0 flex-[999_1_460px] flex-col gap-5 lg:gap-6">
          {error && <Alert title={`No pudimos guardar el ${noun}`}>{error}</Alert>}

          <Controller
            control={control}
            name="kind"
            render={({ field }) => (
              <SegmentedControl
                ariaLabel="Tipo de movimiento"
                options={KIND_OPTIONS}
                value={field.value}
                onChange={(v) => {
                  field.onChange(v);
                  setValue("categoryId", "");
                }}
              />
            )}
          />

          <Controller
            control={control}
            name="amount"
            render={({ field, fieldState }) => (
              <Field label="Monto" error={fieldState.error?.message}>
                <MoneyInput
                  ref={field.ref}
                  name={field.name}
                  onBlur={field.onBlur}
                  autoFocus
                  size="lg"
                  currency={currency}
                  value={field.value ?? null}
                  onValueChange={(c) => field.onChange(c ?? undefined)}
                />
              </Field>
            )}
          />

          <Controller
            control={control}
            name="categoryId"
            render={({ field, fieldState }) => (
              <CategoryPicker
                categories={categories}
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error ? "Elige una categoría" : undefined}
              />
            )}
          />

          <div className="grid gap-5 lg:grid-cols-2">
            <Field label={kind === "expense" ? "Cuenta de donde salió" : "Cuenta donde entró"} error={formState.errors.accountId?.message}>
              <Select
                {...register("accountId")}
                value={values.accountId}
                options={accounts.map((a) => ({
                  value: a.id,
                  label: `${a.name} · ${formatMoney(a.balance_cents, a.currency)}`,
                }))}
              />
            </Field>
            <Field label="Fecha" error={formState.errors.occurredOn?.message}>
              <Input type="date" max={today} {...register("occurredOn")} />
            </Field>
          </div>

          <Field label="Nota (opcional)" error={formState.errors.note?.message}>
            <Input placeholder={kind === "expense" ? "Ej. Almuerzo con el equipo" : "Ej. Pago de noviembre"} {...register("note")} />
          </Field>
        </div>

        <aside className="hidden max-w-[360px] min-w-0 flex-[1_1_280px] flex-col gap-3.5 lg:flex">
          <span className="font-mono text-xs tracking-[0.08em] text-muted">RESUMEN</span>
          <dl className="m-0 flex flex-col gap-3 rounded-2xl border border-line p-5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-3">Monto</dt>
              <dd>
                <Money cents={amount} currency={currency} className="text-[17px]" />
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-3">Categoría</dt>
              <dd className="font-medium">{category?.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-3">Cuenta</dt>
              <dd className="font-medium">{account?.name ?? "—"}</dd>
            </div>
            {newBalance !== null && (
              <div className="flex justify-between gap-4 border-t border-surface-2 pt-3">
                <dt className="text-ink-3">Saldo después</dt>
                <dd>
                  <Money cents={newBalance} currency={currency} />
                </dd>
              </div>
            )}
          </dl>
        </aside>
      </div>
    </Sheet>
  );
}
