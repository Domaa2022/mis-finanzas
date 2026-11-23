"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonClasses } from "@/components/ui/Button";
import { ChoiceTiles } from "@/components/ui/ChoiceTiles";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { Field, Input } from "@/components/ui/Field";
import { IconBadge } from "@/components/ui/IconBadge";
import { Money } from "@/components/ui/Money";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { Switch } from "@/components/ui/Switch";
import { otherCurrency } from "@/lib/accounts/cards";
import { ACCOUNT_TYPE_META, type AccountType } from "@/lib/accounts/meta";
import {
  accountSchema,
  accountSubtitle,
  BANK_NONE,
  BANK_OTHER,
  bankNameFrom,
  BANKS,
  initialBalanceFrom,
  isDualCard,
  type AccountInput,
} from "@/lib/accounts/schema";
import { createAccount, setAccountArchived, updateAccount } from "@/lib/actions/accounts";
import { CURRENCY_NAME } from "@/lib/money";

const TYPE_OPTIONS = (Object.keys(ACCOUNT_TYPE_META) as AccountType[]).map((value) => ({
  value,
  label: ACCOUNT_TYPE_META[value].shortLabel,
  icon: ACCOUNT_TYPE_META[value].icon,
}));

const CURRENCY_OPTIONS = [
  { value: "HNL", label: "Lempiras", prefix: "L" },
  { value: "USD", label: "Dólares", prefix: "$" },
] as const;

const BANK_OPTIONS = [
  ...BANKS.map((b) => ({ value: b, label: b })),
  { value: BANK_OTHER, label: "Otro banco" },
  { value: BANK_NONE, label: "Ninguno (efectivo)" },
];

export const EMPTY_ACCOUNT: AccountInput = {
  type: "savings",
  name: "",
  bank: "",
  otherBank: "",
  currency: "HNL",
  balance: 0,
  color: "#0F766E",
  includeInTotal: true,
  dualCurrency: false,
  otherBalance: 0,
};

type Props =
  | { mode: "create"; defaultValues?: AccountInput }
  | { mode: "edit"; accountId: string; defaultValues: AccountInput; archived: boolean };

export function AccountForm(props: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { control, register, handleSubmit, formState, reset, setError: setFieldError, setValue } = useForm<AccountInput>({
    resolver: zodResolver(accountSchema),
    defaultValues: props.defaultValues ?? EMPTY_ACCOUNT,
  });
  const values = useWatch({ control });
  const type = values.type ?? "savings";
  const isCard = type === "credit_card";
  const currency = values.currency ?? "HNL";
  const other = otherCurrency(currency);
  const dual = isDualCard({ type, dualCurrency: values.dualCurrency ?? false });

  const onSubmit = handleSubmit((input) =>
    startTransition(async () => {
      setError(null);
      const result = props.mode === "create" ? await createAccount(input) : await updateAccount(props.accountId, input);
      if (!result.ok) {
        setError(result.error);
        for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
          setFieldError(field as keyof AccountInput, { message });
        }
        return;
      }
      reset(props.mode === "create" ? EMPTY_ACCOUNT : input);
      router.push("/cuentas");
    }),
  );

  const toggleArchive = () =>
    startTransition(async () => {
      if (props.mode !== "edit") return;
      const result = await setAccountArchived(props.accountId, !props.archived);
      if (!result.ok) return setError(result.error);
      router.push("/cuentas");
    });

  const previewBalance = initialBalanceFrom(type, values.balance ?? 0);
  const previewName = values.name?.trim() || ACCOUNT_TYPE_META[type].label;
  const previewBank = bankNameFrom({ bank: values.bank ?? "", otherBank: values.otherBank ?? "" });

  return (
    <Sheet
      as="form"
      noValidate
      onSubmit={onSubmit}
      aria-label={props.mode === "create" ? "Nueva cuenta" : "Editar cuenta"}
      footer={
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={pending} aria-busy={pending} className="w-full lg:w-auto lg:px-7">
            {pending ? "Guardando…" : "Guardar cuenta"}
          </Button>
          <Link
            href="/cuentas"
            className={buttonClasses({ variant: "secondary", className: "hidden font-medium lg:inline-flex" })}
          >
            Cancelar
          </Link>
        </div>
      }
    >
      <div className="flex flex-wrap items-start gap-12">
        <div className="flex max-w-[640px] min-w-0 flex-[999_1_460px] flex-col gap-5 lg:gap-6">
          {error && <Alert title="No pudimos guardar la cuenta">{error}</Alert>}

          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <ChoiceTiles
                legend="Tipo de cuenta"
                options={TYPE_OPTIONS}
                value={field.value}
                onChange={(v) => {
                  field.onChange(v);
                  if (v === "cash" && !values.bank) setValue("bank", BANK_NONE);
                }}
              />
            )}
          />

          <div className="grid gap-5 lg:grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
            <Field label="Nombre de la cuenta" error={formState.errors.name?.message}>
              <Input placeholder="Ej. Ahorro para el viaje" autoComplete="off" {...register("name")} />
            </Field>
            <Field label="Banco" error={formState.errors.bank?.message}>
              <Select placeholder="Selecciona tu banco" options={BANK_OPTIONS} {...register("bank")} value={values.bank} />
            </Field>
            {values.bank === BANK_OTHER && (
              <Field label="Nombre del banco" error={formState.errors.otherBank?.message}>
                <Input autoComplete="off" {...register("otherBank")} />
              </Field>
            )}
          </div>

          <div className="grid items-start gap-5 lg:grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <SegmentedControl legend={dual ? "Moneda principal" : "Moneda"} options={CURRENCY_OPTIONS} value={field.value} onChange={field.onChange} />
              )}
            />
            <Controller
              control={control}
              name="balance"
              render={({ field, fieldState }) => (
                <Field
                  label={
                    isCard ? (dual ? `Deuda actual en ${CURRENCY_NAME[currency].toLowerCase()}` : "Deuda actual") : "Saldo actual"
                  }
                  hint={
                    isCard
                      ? "Lo que debes hoy en la tarjeta. Puedes ajustarlo después."
                      : "Lo que tienes hoy en esta cuenta. Puedes ajustarlo después."
                  }
                  error={fieldState.error?.message}
                >
                  <MoneyInput
                    ref={field.ref}
                    name={field.name}
                    onBlur={field.onBlur}
                    currency={values.currency ?? "HNL"}
                    value={field.value ?? 0}
                    allowNegative={!isCard}
                    onValueChange={(c) => field.onChange(c ?? 0)}
                  />
                </Field>
              )}
            />
          </div>

          {isCard && (
            <div className="flex flex-col gap-4 border-t border-surface-2 pt-2">
              <Controller
                control={control}
                name="dualCurrency"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    label={
                      <span className="flex flex-col gap-0.5">
                        <span className="font-medium">También tiene deuda en {CURRENCY_NAME[other].toLowerCase()}</span>
                        <span className="text-[13px] text-muted">
                          {props.mode === "edit" && props.defaultValues.dualCurrency
                            ? "Si lo desactivas, esa deuda se archiva con sus movimientos."
                            : "Para tarjetas que llevan un saldo en cada moneda."}
                        </span>
                      </span>
                    }
                  />
                )}
              />
              {dual && (
                <Controller
                  control={control}
                  name="otherBalance"
                  render={({ field, fieldState }) => (
                    <Field
                      label={`Deuda actual en ${CURRENCY_NAME[other].toLowerCase()}`}
                      hint="Lo que debes hoy en esa moneda."
                      error={fieldState.error?.message}
                      className="lg:max-w-[calc(50%-10px)]"
                    >
                      <MoneyInput
                        ref={field.ref}
                        name={field.name}
                        onBlur={field.onBlur}
                        currency={other}
                        value={field.value ?? 0}
                        onValueChange={(c) => field.onChange(c ?? 0)}
                      />
                    </Field>
                  )}
                />
              )}
            </div>
          )}

          <Controller
            control={control}
            name="color"
            render={({ field }) => <ColorPicker value={field.value} onChange={field.onChange} />}
          />

          <div className="border-t border-surface-2 pt-2">
            <Controller
              control={control}
              name="includeInTotal"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  label={
                    <span className="flex flex-col gap-0.5">
                      <span className="font-medium">Incluir en el saldo total</span>
                      <span className="text-[13px] text-muted">Desactívalo para cuentas que no quieras sumar.</span>
                    </span>
                  }
                />
              )}
            />
          </div>

          {props.mode === "edit" && (
            <div className="border-t border-surface-2 pt-4">
              <Button variant="secondary" size="md" onClick={toggleArchive} disabled={pending}>
                {props.archived ? "Restaurar cuenta" : "Archivar cuenta"}
              </Button>
              <p className="mt-2 text-[13px] text-muted">
                {props.archived
                  ? "Volverá a aparecer en Inicio y al registrar gastos."
                  : "Deja de aparecer en Inicio y al registrar gastos. Sus movimientos se conservan."}
              </p>
            </div>
          )}
        </div>

        <aside className="hidden max-w-[360px] min-w-0 flex-[1_1_280px] flex-col gap-3.5 lg:flex">
          <span className="font-mono text-xs tracking-[0.08em] text-muted">VISTA PREVIA</span>
          <div className="flex flex-col gap-3.5 rounded-2xl border border-line bg-white p-5">
            <IconBadge icon={ACCOUNT_TYPE_META[type].icon} color={values.color ?? "#0F766E"} size="xl" />
            <span className="flex flex-col gap-0.5">
              <span className="text-[17px] font-semibold">{previewName}</span>
              <span className="text-sm text-ink-3">
                {accountSubtitle(previewBank, type, dual ? "Lempiras y dólares" : CURRENCY_NAME[currency])}
              </span>
            </span>
            <span className="flex flex-col">
              <Money cents={previewBalance} currency={currency} className="text-[22px]" />
              {dual && (
                <Money
                  cents={initialBalanceFrom("credit_card", values.otherBalance ?? 0)}
                  currency={other}
                  className="text-[15px] text-ink-3"
                />
              )}
            </span>
          </div>
          <p className="text-sm leading-normal text-ink-3">
            Así aparecerá en <strong className="font-semibold text-ink">Tus cuentas</strong> en Inicio y en el selector al
            registrar un gasto.
          </p>
        </aside>
      </div>
    </Sheet>
  );
}
