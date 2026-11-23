"use client";

import type { LucideIcon } from "lucide-react";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ChoiceTile<T extends string> = { value: T; label: string; icon: LucideIcon };

/**
 * Opciones grandes con ícono (Tipo de cuenta: Ahorro, Corriente, Tarjeta, Efectivo).
 * Radios nativos: se navega con flechas.
 */
export function ChoiceTiles<T extends string>({
  legend,
  options,
  value,
  onChange,
  columns = 4,
  className,
}: {
  legend: ReactNode;
  options: readonly ChoiceTile<T>[];
  value: T;
  onChange: (value: T) => void;
  columns?: number;
  className?: string;
}) {
  const name = useId();
  return (
    <fieldset className={cn("m-0 min-w-0 border-0 p-0", className)}>
      <legend className="mb-2 p-0 text-sm font-medium text-ink">{legend}</legend>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {options.map(({ value: v, label, icon: Icon }) => {
          const checked = v === value;
          return (
            <label
              key={v}
              className={cn(
                "relative flex min-h-[72px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold",
                "has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-ink",
                checked
                  ? "border-2 border-primary bg-primary-soft text-primary"
                  : "border border-line-strong bg-white text-ink-2 hover:border-ink-3",
              )}
            >
              <input
                type="radio"
                name={name}
                value={v}
                checked={checked}
                onChange={() => onChange(v)}
                className="sr-only"
              />
              <Icon aria-hidden size={22} strokeWidth={1.75} />
              {label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
