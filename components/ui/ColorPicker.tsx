"use client";

import { Check } from "lucide-react";
import { useId } from "react";
import { ACCOUNT_COLORS } from "@/lib/accounts/meta";
import { cn } from "@/lib/cn";

/** Paleta de colores de cuenta/categoría con áreas táctiles de 44 px. */
export function ColorPicker({
  value,
  onChange,
  legend = "Color",
}: {
  value: string;
  onChange: (value: string) => void;
  legend?: string;
}) {
  const name = useId();
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-1 border-0 p-0">
      <legend className="mb-1 p-0 text-sm font-medium text-ink">{legend}</legend>
      <div className="-ml-1.5 flex flex-wrap gap-1">
        {ACCOUNT_COLORS.map((c) => {
          const checked = c.value.toLowerCase() === value.toLowerCase();
          return (
            <label
              key={c.value}
              className="relative flex size-11 cursor-pointer items-center justify-center rounded-full has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-ink"
            >
              <input
                type="radio"
                name={name}
                value={c.value}
                aria-label={c.name}
                checked={checked}
                onChange={() => onChange(c.value)}
                className="sr-only"
              />
              <span
                className={cn("flex size-8 items-center justify-center rounded-full text-white")}
                style={{
                  backgroundColor: c.value,
                  boxShadow: checked ? `0 0 0 3px #FFFFFF, 0 0 0 5px ${c.value}` : undefined,
                }}
              >
                {checked && <Check aria-hidden size={16} strokeWidth={3} />}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
