"use client";

import { useState, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { CURRENCY_SYMBOL, formatAmount, parseMoneyInput, type Currency } from "@/lib/money";
import { controlClasses, useFieldControl } from "./Field";

type MoneyInputProps = Omit<ComponentProps<"input">, "value" | "defaultValue" | "onChange" | "type" | "size"> & {
  currency: Currency;
  /** Monto en centavos, o null si el campo está vacío o no es válido. */
  value: number | null;
  onValueChange: (cents: number | null) => void;
  allowNegative?: boolean;
  /** `lg` es el monto grande de "Registrar gasto". */
  size?: "md" | "lg";
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
        {...props}
        {...a11y}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        onChange={(event) => {
          const next = event.target.value.replace(allowed, "");
          const cents = parseMoneyInput(next, { allowNegative });
          setText(next);
          setSyncedValue(cents);
          onValueChange(cents);
        }}
        onBlur={(event) => {
          const cents = parseMoneyInput(text, { allowNegative });
          if (cents !== null) setText(formatAmount(cents));
          onBlur?.(event);
        }}
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
