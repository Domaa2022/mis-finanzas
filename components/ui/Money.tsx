import { cn } from "@/lib/cn";
import { formatMoney, type Currency } from "@/lib/money";

type MoneyProps = {
  cents: number;
  currency: Currency;
  signDisplay?: "auto" | "always";
  className?: string;
};

/** Monto formateado en Geist Mono: `L 1,234.50`. */
export function Money({ cents, currency, signDisplay, className }: MoneyProps) {
  return (
    <span className={cn("font-mono font-medium whitespace-nowrap tabular-nums", className)}>
      {formatMoney(cents, currency, { signDisplay })}
    </span>
  );
}
