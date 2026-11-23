"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";
import { useId, type ReactNode } from "react";
import { ACCOUNT_TYPE_META, type AccountType } from "@/lib/accounts/meta";
import { cn } from "@/lib/cn";
import { IconBadge } from "./IconBadge";

export type SelectCardOption = {
  value: string;
  label: string;
  subtitle: string;
  color: string;
  /** Ícono como componente (solo desde componentes de cliente). */
  icon?: LucideIcon;
  /** Nombre del ícono guardado en la base (metas, categorías). */
  iconName?: string;
  /** Tipo de cuenta: usa su ícono. Serializable desde el servidor. */
  accountType?: AccountType;
};

/**
 * Tarjeta seleccionable ("Desde", "Hacia", "Meta"): muestra la opción elegida
 * con su ícono y abre la lista nativa del sistema al tocarla.
 */
export function AccountSelectCard({
  label,
  options,
  value,
  onChange,
  error,
  placeholder = "Elige una opción",
  hint,
}: {
  label: string;
  options: readonly SelectCardOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  hint?: ReactNode;
}) {
  const id = useId();
  const current = options.find((o) => o.value === value);
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div
        className={cn(
          "relative flex w-full items-center gap-3 rounded-xl bg-white px-3.5 py-3",
          "has-[select:focus-visible]:outline-2 has-[select:focus-visible]:outline-offset-2 has-[select:focus-visible]:outline-ink",
          error ? "border-2 border-warn px-[13px] py-[11px]" : "border border-line-strong",
        )}
      >
        {current ? (
          <IconBadge
            icon={current.icon ?? (current.accountType ? ACCOUNT_TYPE_META[current.accountType].icon : undefined)}
            name={current.iconName}
            color={current.color}
          />
        ) : (
          <span className="size-10 flex-none rounded-[10px] bg-surface-2" />
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[15px] font-semibold">{current?.label ?? placeholder}</span>
          {current && <span className="truncate text-[13px] text-ink-3">{current.subtitle}</span>}
        </span>
        <ChevronDown aria-hidden size={18} strokeWidth={2} className="flex-none text-faint" />
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        >
          {!current && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label} · {o.subtitle}
            </option>
          ))}
        </select>
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-[13px] text-warn">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
