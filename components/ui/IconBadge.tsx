import type { LucideIcon } from "lucide-react";
import { createElement } from "react";
import { cn } from "@/lib/cn";
import { iconFor } from "@/lib/categories/icons";

const SIZES = {
  sm: { box: "size-8 rounded-lg", icon: 18 },
  md: { box: "size-9 rounded-[10px]", icon: 20 },
  lg: { box: "size-10 rounded-[10px]", icon: 20 },
  xl: { box: "size-11 rounded-[10px]", icon: 22 },
} as const;

/** Cuadro de color con un ícono blanco (cuentas, categorías, metas). */
export function IconBadge({
  icon,
  name,
  color,
  size = "lg",
  className,
}: {
  /** Componente de ícono, o `name` con el nombre guardado en la base. */
  icon?: LucideIcon;
  name?: string;
  color: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <span
      className={cn("flex flex-none items-center justify-center text-white", s.box, className)}
      style={{ backgroundColor: color }}
    >
      {createElement(icon ?? iconFor(name), { "aria-hidden": true, size: s.icon, strokeWidth: 1.75 })}
    </span>
  );
}
