import { Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type AlertProps = {
  /** `warn`: errores y alertas en ámbar (nunca rojo). `info`: avisos neutros. */
  tone?: "warn" | "info";
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/** Aviso en bloque, como el error de inicio de sesión de `Movil-error`. */
export function Alert({ tone = "warn", title, children, className }: AlertProps) {
  const warn = tone === "warn";
  const Icon = warn ? TriangleAlert : Info;
  return (
    <div
      role={warn ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-lg px-3.5 py-3",
        warn ? "border border-warn-line bg-warn-soft" : "bg-surface-2",
        className,
      )}
    >
      <Icon
        aria-hidden
        size={20}
        strokeWidth={2}
        className={cn("mt-px flex-none", warn ? "text-warn" : "text-ink-3")}
      />
      <div className="flex flex-col gap-0.5 text-sm leading-[1.45]">
        {title && <span className="font-semibold text-ink">{title}</span>}
        {children && <span className="text-ink-2">{children}</span>}
      </div>
    </div>
  );
}
