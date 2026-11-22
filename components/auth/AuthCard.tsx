import type { ReactNode } from "react";

/**
 * Contenido de la tarjeta de autenticación: título, subtítulo (solo web),
 * formulario y pie ("¿No tienes cuenta?…") pegado abajo en móvil.
 */
export function AuthCard({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col justify-between gap-8 lg:gap-5">
      <div className="flex flex-col gap-4 lg:gap-5">
        <div className="mb-1 flex flex-col gap-2 lg:mb-2">
          <h1 className="text-2xl leading-[1.15] font-semibold tracking-[-0.02em] lg:text-4xl lg:leading-[1.1] lg:tracking-[-0.025em]">
            {title}
          </h1>
          {subtitle && <p className="hidden text-base leading-normal text-ink-3 lg:block">{subtitle}</p>}
        </div>
        {children}
      </div>
      {footer && <p className="text-center text-sm text-ink-3">{footer}</p>}
    </div>
  );
}

/** Esqueleto que se muestra mientras carga el formulario. */
export function AuthFormSkeleton() {
  return (
    <div aria-hidden className="flex animate-pulse flex-col gap-4">
      <div className="h-7 w-40 rounded bg-surface-2" />
      <div className="h-[50px] rounded-lg bg-surface-2" />
      <div className="h-[50px] rounded-lg bg-surface-2" />
      <div className="h-[52px] rounded-lg bg-surface-2" />
    </div>
  );
}
