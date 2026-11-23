import { cn } from "@/lib/cn";

/** Bloque gris animado para estados de carga. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-lg bg-surface-2", className)} />;
}

/** Carga de un formulario: varios campos. */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div role="status" aria-label="Cargando" className="flex max-w-[640px] flex-col gap-5">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-[50px]" />
        </div>
      ))}
    </div>
  );
}

/** Carga de una lista de filas con ícono. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Cargando" className="flex flex-col">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3.5 border-b border-surface-2 py-3.5">
          <Skeleton className="size-10 rounded-[10px]" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

/** Carga de las tarjetas de resumen. */
export function StatsSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div role="status" aria-label="Cargando" className="grid grid-cols-2 gap-3 lg:max-w-[720px]">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-[78px] rounded-xl lg:h-[92px] lg:rounded-[14px]" />
      ))}
    </div>
  );
}

/** Carga de una fila de tarjetas (cuentas en Inicio, metas). */
export function TilesSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className="flex gap-2.5 overflow-hidden px-6 lg:grid lg:grid-cols-[repeat(auto-fill,minmax(168px,1fr))] lg:gap-3 lg:px-0"
    >
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-[146px] w-[132px] flex-none rounded-[14px] lg:h-[158px] lg:w-auto" />
      ))}
    </div>
  );
}
