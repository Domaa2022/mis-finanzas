import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type SheetProps = Omit<ComponentProps<"form">, "className" | "children"> & {
  children: ReactNode;
  /**
   * Botones del formulario. En móvil quedan fijos abajo (pantalla completa);
   * en web van al final del contenido, alineados a la izquierda.
   */
  footer?: ReactNode;
  as?: "main" | "section" | "div" | "form";
  className?: string;
};

/**
 * Hoja blanca con esquinas superiores de 28 px que se monta sobre la franja roja.
 * En web sube 32 px sobre el PageHeader, como en los diseños `Web-…`.
 */
export function Sheet({ children, footer, as: Tag = "div", className, ...props }: SheetProps) {
  const Component = Tag as "form";
  return (
    <Component {...props} className="relative flex min-h-0 flex-1 flex-col rounded-t-[28px] bg-white lg:-mt-8">
      <div
        className={cn(
          "flex flex-1 flex-col gap-4 px-6 pt-[22px] pb-6 lg:gap-8 lg:px-[clamp(24px,4vw,56px)] lg:pt-8 lg:pb-14",
          className,
        )}
      >
        {children}
      </div>
      {footer && (
        <div
          className={cn(
            "sticky bottom-0 z-10 border-t border-surface-2 bg-white px-6 pt-3 pb-[max(28px,env(safe-area-inset-bottom))]",
            "lg:static lg:border-0 lg:px-[clamp(24px,4vw,56px)] lg:pt-0 lg:pb-14",
          )}
        >
          {footer}
        </div>
      )}
    </Component>
  );
}
