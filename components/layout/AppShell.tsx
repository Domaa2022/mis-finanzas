import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";

/**
 * Estructura de las pantallas privadas.
 * - Menos de 1024 px: contenido a pantalla completa y barra inferior fija.
 *   Los formularios (`withBottomNav={false}`) ocupan toda la pantalla.
 * - 1024 px o más: menú lateral fijo a la izquierda.
 *
 * El contenido es una columna con fondo rojo: cada página pone su PageHeader
 * y debajo una Sheet blanca que ocupa el resto de la altura.
 */
export function AppShell({ children, withBottomNav = true }: { children: ReactNode; withBottomNav?: boolean }) {
  return (
    <div className="flex min-h-dvh bg-white">
      <Sidebar className="hidden lg:flex" />
      <div
        className={cn(
          "flex min-h-dvh min-w-0 flex-1 flex-col bg-primary lg:bg-white lg:pb-0",
          withBottomNav && "pb-[calc(74px+env(safe-area-inset-bottom))]",
        )}
      >
        {children}
      </div>
      {withBottomNav && <BottomNav className="lg:hidden" />}
    </div>
  );
}
