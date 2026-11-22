import Link from "next/link";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type PageHeaderProps = {
  title: ReactNode;
  /** Línea en Geist Mono mayúsculas sobre el título ("NOVIEMBRE 2026"). */
  eyebrow?: string;
  /** Cifra principal debajo del título. */
  figure?: ReactNode;
  /** Acciones a la derecha (notificaciones, selector de cuentas…). */
  actions?: ReactNode;
  /** Muestra el botón "Cerrar" (X) que vuelve a esta ruta. Para formularios. */
  closeHref?: string;
  /** Fila superior (logo y notificaciones en el Inicio móvil). */
  topBar?: ReactNode;
  /** Contenido extra debajo (barra de progreso, selector…). */
  children?: ReactNode;
  className?: string;
};

/** Franja roja superior con título y cifra principal. */
export function PageHeader({ title, eyebrow, figure, actions, closeHref, topBar, children, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "on-primary flex flex-col gap-[18px] bg-primary px-6 pt-14 pb-6 text-white",
        "lg:px-[clamp(24px,4vw,56px)] lg:pt-10 lg:pb-16",
        className,
      )}
    >
      {topBar}
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex min-w-0 flex-col gap-1 lg:gap-1.5">
          {eyebrow && (
            <span className="font-mono text-xs tracking-[0.08em] text-on-primary-muted uppercase">{eyebrow}</span>
          )}
          <h1 className="m-0 text-[28px] leading-[1.15] font-semibold tracking-[-0.025em] lg:text-4xl lg:leading-[1.1] lg:tracking-[-0.03em]">
            {title}
          </h1>
          {figure && <div className="mt-1 font-mono text-[32px] leading-tight font-medium lg:text-[40px]">{figure}</div>}
        </div>
        {(actions || closeHref) && (
          <div className="flex items-center gap-2">
            {actions}
            {closeHref && (
              <Link
                href={closeHref}
                aria-label="Cerrar"
                className="-mr-2 flex size-11 items-center justify-center rounded-full text-white hover:bg-white/10 hover:text-white"
              >
                <X aria-hidden size={24} strokeWidth={2} />
              </Link>
            )}
          </div>
        )}
      </div>
      {children}
    </header>
  );
}
