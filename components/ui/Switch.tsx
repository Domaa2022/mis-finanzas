"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Texto visible a la izquierda del interruptor. */
  label?: ReactNode;
  /** Nombre accesible cuando no hay `label` visible. */
  "aria-label"?: string;
  disabled?: boolean;
  className?: string;
};

/** Interruptor de encendido/apagado (por ejemplo, pausar un ahorro programado). */
export function Switch({ checked, onCheckedChange, label, disabled, className, ...props }: SwitchProps) {
  const labelId = useId();

  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ? undefined : props["aria-label"]}
      aria-labelledby={label ? labelId : undefined}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        // El ::before amplía el área táctil a 44 px sin cambiar el tamaño visible.
        "relative h-7 w-12 flex-none cursor-pointer rounded-full transition-colors",
        "before:absolute before:-inset-2 before:content-['']",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-ink" : "bg-line-strong",
        !label && className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-[3px] left-[3px] size-[22px] rounded-full bg-white transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  );

  if (!label) return control;

  return (
    <div className={cn("flex min-h-11 items-center justify-between gap-4", className)}>
      <span id={labelId} className="text-[15px] text-ink">
        {label}
      </span>
      {control}
    </div>
  );
}
