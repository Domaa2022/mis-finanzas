import { cn } from "@/lib/cn";

type ProgressBarProps = {
  /** Valor actual. Puede pasar de `max` (presupuesto excedido): la barra se llena. */
  value: number;
  max?: number;
  /** Nombre accesible, por ejemplo "Presupuesto de Comida". */
  label: string;
  /** Texto que lee el lector de pantalla. Por defecto, el porcentaje. */
  valueText?: string;
  /** Color de la barra (color de categoría, `var(--color-warn-bar)`…). */
  color?: string;
  /** `on-primary`: barra blanca sobre la franja roja. */
  variant?: "default" | "on-primary";
  className?: string;
};

export function ProgressBar({
  value,
  max = 100,
  label,
  valueText,
  color,
  variant = "default",
  className,
}: ProgressBarProps) {
  const ratio = max > 0 ? Math.max(0, value) / max : 0;
  const percent = Math.round(ratio * 100);
  const width = Math.min(100, ratio * 100);
  const onPrimary = variant === "on-primary";

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(Math.max(0, value), max)}
      aria-valuetext={valueText ?? `${percent} %`}
      className={cn("h-2 overflow-hidden rounded-full", onPrimary ? "bg-white/25" : "bg-surface-2", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width]", onPrimary ? "bg-white" : !color && "bg-ink")}
        style={{ width: `${width}%`, backgroundColor: onPrimary ? undefined : color }}
      />
    </div>
  );
}
