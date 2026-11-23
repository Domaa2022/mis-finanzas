"use client";

import { useState, type ComponentProps } from "react";
import type React from "react";
import { cn } from "@/lib/cn";
import { CURRENCY_SYMBOL, formatAmount, parseMoneyInput, type Currency } from "@/lib/money";
import { controlClasses, useFieldControl } from "./Field";

type MoneyInputProps = Omit<ComponentProps<"input">, "value" | "defaultValue" | "onChange" | "type" | "size"> & {
  currency: Currency;
  /** Monto en centavos, o null si el campo está vacío o no es válido. */
  value: number | null;
  onValueChange: (cents: number | null) => void;
  allowNegative?: boolean;
  /**
   * `lg`: monto grande de "Registrar gasto".
   * `hero`: monto centrado con línea inferior ("Monto a transferir").
   */
  size?: "md" | "lg" | "hero";
};

const textFor = (cents: number | null) => (cents === null ? "" : formatAmount(cents));

/**
 * Campo de monto con el símbolo de la moneda delante.
 * Mientras se escribe guarda el texto tal cual; al salir lo formatea ("1234.5" → "1,234.50").
 * Hacia afuera siempre entrega centavos enteros.
 */
export function MoneyInput({
  currency,
  value,
  onValueChange,
  allowNegative = false,
  size = "md",
  className,
  onBlur,
  placeholder = "0.00",
  ...props
}: MoneyInputProps) {
  const { invalid, ...a11y } = useFieldControl(props);
  const [text, setText] = useState(() => textFor(value));
  const [syncedValue, setSyncedValue] = useState(value);

  // Si el valor cambia desde afuera (reset del formulario, "Todo el saldo"…),
  // se actualiza el texto sin pisar lo que la persona está escribiendo.
  if (value !== syncedValue) {
    setSyncedValue(value);
    if (parseMoneyInput(text, { allowNegative }) !== value) setText(textFor(value));
  }

  const allowed = allowNegative ? /[^\d.,\s-]/g : /[^\d.,\s]/g;

  const inputProps = {
    ...props,
    ...a11y,
    type: "text",
    inputMode: "decimal" as const,
    autoComplete: "off",
    placeholder,
    value: text,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = event.target.value.replace(allowed, "");
      const cents = parseMoneyInput(next, { allowNegative });
      setText(next);
      setSyncedValue(cents);
      onValueChange(cents);
    },
    onBlur: (event: React.FocusEvent<HTMLInputElement>) => {
      const cents = parseMoneyInput(text, { allowNegative });
      if (cents !== null) setText(formatAmount(cents));
      onBlur?.(event);
    },
  };

  if (size === "hero") {
    return (
      <div className="flex items-baseline justify-center gap-2">
        <span aria-hidden className="font-mono text-xl text-muted lg:text-2xl">
          {CURRENCY_SYMBOL[currency]}
        </span>
        <input
          {...inputProps}
          className={cn(
            "w-[min(260px,70vw)] border-0 border-b-2 bg-transparent px-0 pb-1 text-center font-mono text-[40px] font-medium text-ink tabular-nums placeholder:text-line-strong lg:text-5xl",
            invalid ? "border-warn" : "border-line focus:border-ink",
            className,
          )}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2 font-mono text-ink-3",
          size === "lg" ? "left-4 text-2xl" : "left-3.5 text-base",
        )}
      >
        {CURRENCY_SYMBOL[currency]}
      </span>
      <input
        {...inputProps}
        className={controlClasses(
          invalid,
          cn(
            "font-mono tabular-nums",
            size === "lg" ? "h-16 pl-11 text-[32px] font-medium tracking-tight" : "pl-9",
            invalid && (size === "lg" ? "pl-[43px]" : "pl-[35px]"),
            className,
          ),
        )}
      />
    </div>
  );
}
