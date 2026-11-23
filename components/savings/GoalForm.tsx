"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonClasses } from "@/components/ui/Button";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { Field, Input } from "@/components/ui/Field";
import { IconBadge } from "@/components/ui/IconBadge";
import { Money } from "@/components/ui/Money";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Sheet } from "@/components/ui/Sheet";
import { createGoal } from "@/lib/actions/savings";
import { ICONS } from "@/lib/categories/icons";
import { cn } from "@/lib/cn";
import { GOAL_ICONS, goalSchema, type GoalInput } from "@/lib/savings/schemas";

const CURRENCY_OPTIONS = [
  { value: "HNL", label: "Lempiras", prefix: "L" },
  { value: "USD", label: "Dólares", prefix: "$" },
] as const;

const EMPTY: Partial<GoalInput> = { name: "", icon: "plane", color: "#0F766E", currency: "HNL", targetDate: "" };

export function GoalForm({ today }: { today: string }) {
  const router = useRouter();
  const iconName = useId();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { control, register, handleSubmit, formState, reset } = useForm<GoalInput>({
    resolver: zodResolver(goalSchema),
    defaultValues: EMPTY,
  });
  const v = useWatch({ control });

  const onSubmit = handleSubmit((input) =>
    startTransition(async () => {
      setError(null);
      const result = await createGoal(input);
      if (!result.ok) return setError(result.error);
      reset(EMPTY);
      router.push("/ahorros");
    }),
  );

  return (
    <Sheet
      as="form"
      noValidate
      onSubmit={onSubmit}
      aria-label="Nueva meta"
      footer={
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={pending} aria-busy={pending} className="w-full lg:w-auto lg:px-7">
            {pending ? "Guardando…" : "Crear meta"}
          </Button>
          <Link href="/ahorros" className={buttonClasses({ variant: "secondary", className: "hidden font-medium lg:inline-flex" })}>
            Cancelar
          </Link>
        </div>
      }
    >
      <div className="flex flex-wrap items-start gap-12">
        <div className="flex max-w-[600px] min-w-0 flex-[999_1_460px] flex-col gap-5 lg:gap-6">
          {error && <Alert title="No pudimos crear la meta">{error}</Alert>}
          <Field label="Nombre de la meta" error={formState.errors.name?.message}>
            <Input placeholder="Ej. Viaje a Roatán" autoComplete="off" {...register("name")} />
          </Field>

          <Controller
            control={control}
            name="icon"
            render={({ field }) => (
              <fieldset className="m-0 border-0 p-0">
                <legend className="mb-2 p-0 text-sm font-medium">Ícono</legend>
                <div className="flex flex-wrap gap-2">
                  {GOAL_ICONS.map((name) => {
                    const checked = field.value === name;
                    const Icon = ICONS[name].icon;
                    return (
                      <label
                        key={name}
                        className={cn(
                          "flex size-12 cursor-pointer items-center justify-center rounded-xl has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-ink",
                          checked ? "border-2 border-primary bg-primary-soft text-primary" : "border border-line text-ink-2 hover:border-line-strong",
                        )}
                      >
                        <input
                          type="radio"
                          name={iconName}
                          className="sr-only"
                          aria-label={ICONS[name].label}
                          checked={checked}
                          onChange={() => field.onChange(name)}
                        />
                        <Icon aria-hidden size={22} strokeWidth={1.75} />
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}
          />

          <div className="grid items-start gap-5 lg:grid-cols-2">
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <SegmentedControl legend="Moneda" options={CURRENCY_OPTIONS} value={field.value} onChange={field.onChange} />
              )}
            />
            <Controller
              control={control}
              name="target"
              render={({ field, fieldState }) => (
                <Field label="¿Cuánto quieres juntar?" error={fieldState.error?.message}>
                  <MoneyInput
                    ref={field.ref}
                    name={field.name}
                    onBlur={field.onBlur}
                    currency={v.currency ?? "HNL"}
                    value={field.value ?? null}
                    onValueChange={(c) => field.onChange(c ?? undefined)}
                  />
                </Field>
              )}
            />
          </div>

          <Field
            label={
              <>
                Fecha objetivo <span className="font-normal text-muted">(opcional)</span>
              </>
            }
            error={formState.errors.targetDate?.message}
          >
            <Input type="date" min={today} {...register("targetDate")} />
          </Field>

          <Controller control={control} name="color" render={({ field }) => <ColorPicker value={field.value} onChange={field.onChange} />} />
        </div>

        <aside className="hidden max-w-[360px] min-w-0 flex-[1_1_280px] flex-col gap-3.5 lg:flex">
          <span className="font-mono text-xs tracking-[0.08em] text-muted">VISTA PREVIA</span>
          <div className="flex flex-col gap-3.5 rounded-[14px] border border-line p-5">
            <div className="flex items-center gap-3">
              <IconBadge name={v.icon} color={v.color ?? "#0F766E"} />
              <span className="flex-1 truncate text-base font-semibold">{v.name?.trim() || "Tu meta"}</span>
              <span className="font-mono text-[15px] font-medium">0 %</span>
            </div>
            <ProgressBar value={0} label="Progreso de la meta" color={v.color} />
            <span className="font-mono text-[13px] text-ink-2">
              <Money cents={0} currency={v.currency ?? "HNL"} className="font-normal" /> de{" "}
              <Money cents={v.target ?? 0} currency={v.currency ?? "HNL"} className="font-normal" />
            </span>
          </div>
        </aside>
      </div>
    </Sheet>
  );
}
