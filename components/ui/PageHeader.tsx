import Link from "next/link";
import { ArrowLeft, ChevronLeft, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type PageHeaderProps = {
  title: ReactNode;
  /** Línea en Geist Mono mayúsculas sobre el título ("NOVIEMBRE 2026"). */
  eyebrow?: ReactNode;
  /** Texto secundario debajo del título ("5 cuentas activas"). */
  subtitle?: ReactNode;
  /** Cifra principal debajo del título. */
  figure?: ReactNode;
  /** Acciones a la derecha (notificaciones, selector de cuentas, botones). */
  actions?: ReactNode;
  /**
   * Pantalla anterior. En móvil es una flecha (o una X si `close`); en web, un
   * enlace de texto sobre el título ("‹ Mis cuentas").
   */
  back?: { href: string; label: string; close?: boolean };
  /** Fila superior (logo y notificaciones en el Inicio móvil). */
  topBar?: ReactNode;
  /** Contenido extra debajo (barra de progreso, selector…). */
  children?: ReactNode;
  className?: string;
};

/** Franja roja superior con título y cifra principal. */
export function PageHeader({
  title,
  eyebrow,
  subtitle,
  figure,
  actions,
  back,
  topBar,
  children,
  className,
}: PageHeaderProps) {
  const mobileBack = back && !back.close;
  const mobileClose = back?.close;

  return (
    <header
      className={cn(
        "on-primary flex flex-col gap-[18px] bg-primary px-6 pt-14 pb-6 text-white",
        "lg:px-[clamp(24px,4vw,56px)] lg:pt-10 lg:pb-16",
        (mobileBack || mobileClose) && "pt-[52px]",
        mobileBack && "gap-3.5 px-4 lg:gap-[18px]",
        className,
      )}
    >
      {topBar}
      {mobileBack && (
        <Link
          href={back.href}
          aria-label={`Volver a ${back.label}`}
          className="flex size-11 items-center justify-center rounded-full text-white hover:bg-white/10 hover:text-white lg:hidden"
        >
          <ArrowLeft aria-hidden size={24} strokeWidth={2} />
        </Link>
      )}
      <div className={cn("flex flex-wrap items-end justify-between gap-5", mobileBack && "px-2 lg:px-0")}>
        <div className="flex min-w-0 flex-1 flex-col gap-1 lg:gap-1.5">
          {back && (
            <Link
              href={back.href}
              className="hidden min-h-8 items-center gap-1 self-start text-sm font-medium text-on-primary-muted hover:text-white lg:inline-flex"
            >
              <ChevronLeft aria-hidden size={18} strokeWidth={2} />
              {back.label}
            </Link>
          )}
          {eyebrow && (
            <span className="font-mono text-xs tracking-[0.08em] text-on-primary-muted uppercase">{eyebrow}</span>
          )}
          <div className="flex items-center justify-between gap-3">
            <h1
              className={cn(
                "m-0 text-[28px] leading-[1.15] font-semibold tracking-[-0.025em] lg:text-4xl lg:leading-[1.1] lg:tracking-[-0.03em]",
                mobileClose && "text-2xl tracking-[-0.02em]",
              )}
            >
              {title}
            </h1>
            {mobileClose && (
              <Link
                href={back.href}
                aria-label="Cerrar"
                className="-mr-2 flex size-11 flex-none items-center justify-center rounded-full text-white hover:bg-white/10 hover:text-white lg:hidden"
              >
                <X aria-hidden size={24} strokeWidth={2} />
              </Link>
            )}
          </div>
          {subtitle && (
            <span className={cn("text-[15px] text-on-primary-muted", mobileClose && "hidden lg:block")}>{subtitle}</span>
          )}
          {figure && (
            <div className="mt-1 font-mono text-[32px] leading-tight font-medium tabular-nums lg:text-[40px]">{figure}</div>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

/** Botón tipo píldora para la franja roja ("Transferir", "Agregar cuenta"). */
export function HeaderPillLink({
  href,
  children,
  solid = false,
  className,
}: {
  href: string;
  children: ReactNode;
  solid?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-12 items-center gap-2 rounded-full px-5 text-[15px] font-semibold",
        solid
          ? "bg-white text-ink hover:bg-primary-soft hover:text-ink"
          : "border border-white/45 text-white hover:bg-white/10 hover:text-white",
        className,
      )}
    >
      {children}
    </Link>
  );
}
