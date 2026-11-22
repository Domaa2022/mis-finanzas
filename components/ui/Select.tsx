"use client";

import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { controlClasses, useFieldControl } from "./Field";

export type SelectOption = { value: string; label: string; disabled?: boolean };

type SelectProps = Omit<ComponentProps<"select">, "children"> & {
  options: readonly SelectOption[];
  /** Texto de la opción vacía ("Selecciona tu banco"). Se muestra en gris. */
  placeholder?: string;
};

/** Select nativo con el estilo de los campos. Accesible y cómodo en móvil. */
export function Select({ options, placeholder, className, value, defaultValue, ...props }: SelectProps) {
  const { invalid, ...a11y } = useFieldControl(props);
  const empty = (value ?? defaultValue ?? "") === "";

  return (
    <div className="relative">
      <select
        {...props}
        {...a11y}
        value={value}
        defaultValue={defaultValue}
        className={cn(controlClasses(invalid, className), "appearance-none pr-11", placeholder && empty && "text-muted")}
      >
        {placeholder !== undefined && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled} className="text-ink">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        size={18}
        strokeWidth={2}
        className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-3"
      />
    </div>
  );
}
