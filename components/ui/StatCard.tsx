import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Tarjeta de resumen gris ("Gastos del mes", "Total en lempiras"). */
export function StatCard({
  label,
  children,
  variant = "filled",
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  /** `outline`: versión vacía con borde (estado sin datos de `Inicio`). */
  variant?: "filled" | "outline";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1.5 rounded-xl px-4 py-3.5 lg:rounded-[14px] lg:px-5 lg:py-[18px]",
        variant === "filled" ? "bg-surface" : "border border-line",
        className,
      )}
    >
      <span className="text-[13px] text-ink-3 lg:text-sm">{label}</span>
      <span className="flex flex-col font-mono text-xl font-medium tabular-nums lg:text-2xl">{children}</span>
    </div>
  );
}
