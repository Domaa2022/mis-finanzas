"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type SegmentedOption<T extends string> = {
  value: T;
  label: ReactNode;
  /** Símbolo en Geist Mono antes del texto, como "L" o "$". */
  prefix?: string;
};

type SegmentedControlProps<T extends string> = {
  /** Título visible del grupo. Si no hay, usa `ariaLabel`. */
  legend?: ReactNode;
  ariaLabel?: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  name?: string;
  className?: string;
};

/**
 * Control segmentado (Lempiras/Dólares, Semanal/Quincenal/Mensual…).
 * Usa radios nativos: flechas del teclado y lectores de pantalla funcionan sin más.
 */
export function SegmentedControl<T extends string>({
  legend,
  ariaLabel,
  options,
  value,
  onChange,
  name,
  className,
}: SegmentedControlProps<T>) {
  const autoName = useId();

  return (
    <fieldset className={cn("m-0 min-w-0 border-0 p-0", className)} aria-label={legend ? undefined : ariaLabel}>
      {legend && <legend className="mb-2 p-0 text-sm font-medium text-ink">{legend}</legend>}
      <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className={cn(
                "relative flex h-11 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-2 text-[15px] transition-colors",
                "has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-ink",
                checked
                  ? "bg-white font-semibold text-ink ring-1 ring-line-strong"
                  : "font-medium text-ink-3 hover:text-ink",
              )}
            >
              <input
                type="radio"
                className="sr-only"
                name={name ?? autoName}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
              />
              {option.prefix && <span className="font-mono text-sm">{option.prefix}</span>}
              <span className="truncate">{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
