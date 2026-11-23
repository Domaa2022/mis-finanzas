"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";
import { IconBadge } from "./IconBadge";

export type PickerCategory = { id: string; name: string; icon: string; color: string };

/** Cuadrícula de categorías como radios (Registrar gasto, presupuestos, gastos fijos). */
export function CategoryPicker({
  legend = "Categoría",
  categories,
  value,
  onChange,
  error,
}: {
  legend?: string;
  categories: readonly PickerCategory[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
}) {
  const name = useId();
  const errorId = `${name}-error`;
  return (
    <fieldset
      className="m-0 min-w-0 border-0 p-0"
      aria-describedby={error ? errorId : undefined}
      aria-invalid={error ? true : undefined}
    >
      <legend className="mb-2 p-0 text-sm font-medium text-ink">{legend}</legend>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {categories.map((c) => {
          const checked = c.id === value;
          return (
            <label
              key={c.id}
              className={cn(
                "flex min-h-[76px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl px-1 py-2 text-center text-[13px] leading-tight font-semibold",
                "has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-ink",
                checked
                  ? "border-2 border-primary bg-primary-soft text-ink"
                  : "border border-line hover:border-line-strong text-ink-2",
              )}
            >
              <input
                type="radio"
                name={name}
                value={c.id}
                checked={checked}
                onChange={() => onChange(c.id)}
                className="sr-only"
              />
              <IconBadge name={c.icon} color={c.color} size="sm" />
              <span className="line-clamp-2">{c.name}</span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id={errorId} className="mt-2 text-[13px] text-warn">
          {error}
        </p>
      )}
    </fieldset>
  );
}
