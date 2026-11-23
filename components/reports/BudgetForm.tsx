"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonClasses } from "@/components/ui/Button";
import { CategoryPicker, type PickerCategory } from "@/components/ui/CategoryPicker";
import { Field } from "@/components/ui/Field";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Sheet } from "@/components/ui/Sheet";
import { deleteBudget, saveBudget } from "@/lib/actions/budgets";
import { monthParam } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { budgetSchema, type BudgetInput } from "@/lib/reports";

type Props = {
  month: string;
  monthLabel: string;
  categories: PickerCategory[];
  /** Gasto del mes por categoría, para orientar el límite. */
  spentByCategory: Record<string, number>;
} & ({ mode: "create" } | { mode: "edit"; id: string; categoryId: string; limit: number });

export function BudgetForm(props: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const back = `/presupuestos?mes=${monthParam(props.month)}`;
  const { control, handleSubmit } = useForm<BudgetInput>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      month: props.month,
      categoryId: props.mode === "edit" ? props.categoryId : (props.categories[0]?.id ?? ""),
      limit: props.mode === "edit" ? props.limit : undefined,
    },
  });
  const v = useWatch({ control });
  const spent = props.spentByCategory[v.categoryId ?? ""] ?? 0;

  const onSubmit = handleSubmit((input) =>
    startTransition(async () => {
      setError(null);
      const r = await saveBudget(input);
      if (!r.ok) return setError(r.error);
      router.push(back);
    }),
  );

  if (props.mode === "create" && props.categories.length === 0) {
    return (
      <Sheet>
        <p className="max-w-md text-[15px] leading-normal text-ink-2">Ya tienes un presupuesto para cada categoría este mes.</p>
        <Link href={back} className={buttonClasses({ variant: "secondary", className: "self-start" })}>
          Volver
        </Link>
      </Sheet>
    );
  }

  return (
    <Sheet
      as="form"
      noValidate
      onSubmit={onSubmit}
      aria-label="Presupuesto"
      footer={
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={pending} aria-busy={pending} className="w-full lg:w-auto lg:px-7">
            {pending ? "Guardando…" : "Guardar presupuesto"}
          </Button>
          <Link href={back} className={buttonClasses({ variant: "secondary", className: "hidden font-medium lg:inline-flex" })}>
            Cancelar
          </Link>
        </div>
      }
    >
      <div className="flex max-w-[600px] flex-col gap-5 lg:gap-6">
        {error && <Alert title="No pudimos guardar el presupuesto">{error}</Alert>}
        {props.mode === "create" ? (
          <Controller
            control={control}
            name="categoryId"
            render={({ field, fieldState }) => (
              <CategoryPicker categories={props.categories} value={field.value} onChange={field.onChange} error={fieldState.error ? "Elige una categoría" : undefined} />
            )}
          />
        ) : null}
        <Controller
          control={control}
          name="limit"
          render={({ field, fieldState }) => (
            <Field
              label={`Límite para ${props.monthLabel}`}
              hint={`Llevas ${formatMoney(spent, "HNL")} gastados en esta categoría este mes.`}
              error={fieldState.error?.message}
            >
              <MoneyInput
                ref={field.ref}
                name={field.name}
                onBlur={field.onBlur}
                size="lg"
                currency="HNL"
                value={field.value ?? null}
                onValueChange={(c) => field.onChange(c ?? undefined)}
              />
            </Field>
          )}
        />
        <p className="text-[13px] leading-normal text-muted">
          Te avisamos con “Cerca del límite” al llegar al 80 % y con “Te pasaste del límite” al superarlo.
        </p>
        {props.mode === "edit" && (
          <Button
            variant="ghost"
            size="md"
            className="self-start"
            disabled={pending}
            onClick={() => {
              if (!window.confirm("¿Eliminar este presupuesto?")) return;
              startTransition(async () => {
                const r = await deleteBudget(props.id);
                if (!r.ok) return setError(r.error);
                router.push(back);
              });
            }}
          >
            Eliminar presupuesto
          </Button>
        )}
      </div>
    </Sheet>
  );
}
