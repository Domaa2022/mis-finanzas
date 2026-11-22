import { cn } from "@/lib/cn";
import { ACCOUNT_TYPE_META, ALL_ACCOUNTS_ICON, type AccountType } from "@/lib/accounts/meta";
import type { Currency } from "@/lib/money";
import { Money } from "./Money";

type AccountTileProps = {
  /** `all` es la tarjeta "Todas", con ícono de cuadrícula y fondo oscuro. */
  type: AccountType | "all";
  name: string;
  /** Banco, "Billetera" o "5 cuentas". */
  subtitle: string;
  balanceCents: number;
  currency: Currency;
  /** Color de la cuenta. Se ignora en `all`. */
  color?: string;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
};

/**
 * Tarjeta de cuenta seleccionable de Inicio. Es un botón con aria-pressed;
 * el contenedor decide el ancho (fila con scroll en móvil, cuadrícula en web).
 */
export function AccountTile({
  type,
  name,
  subtitle,
  balanceCents,
  currency,
  color,
  selected = false,
  onSelect,
  className,
}: AccountTileProps) {
  const Icon = type === "all" ? ALL_ACCOUNTS_ICON : ACCOUNT_TYPE_META[type].icon;
  const iconBg = type === "all" ? "var(--color-ink)" : color;

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex min-w-0 cursor-pointer flex-col items-start gap-2.5 rounded-[14px] bg-white p-3.5 text-left text-ink lg:gap-3 lg:p-4",
        selected ? "border-2 border-primary p-[13px] lg:p-[15px]" : "border border-line hover:border-line-strong",
        className,
      )}
    >
      <span
        className="flex size-9 flex-none items-center justify-center rounded-[10px] text-white"
        style={{ backgroundColor: iconBg }}
      >
        <Icon aria-hidden size={20} strokeWidth={1.75} />
      </span>
      <span className="flex w-full min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-semibold lg:text-[15px]">{name}</span>
        <span className="truncate text-xs text-ink-3 lg:text-[13px]">{subtitle}</span>
      </span>
      <Money cents={balanceCents} currency={currency} className="text-[15px] lg:text-[17px]" />
    </button>
  );
}
