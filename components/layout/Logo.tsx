import { cn } from "@/lib/cn";

/** Marca "Mis Finanzas". `on-primary` es la versión blanca para la franja roja. */
export function Logo({ variant = "default", className }: { variant?: "default" | "on-primary"; className?: string }) {
  const onPrimary = variant === "on-primary";
  const bar = onPrimary ? "#FFFFFF" : "var(--color-ink)";
  const accent = onPrimary ? "var(--color-on-primary-accent)" : "var(--color-primary)";

  return (
    <span className={cn("flex items-center gap-2.5", onPrimary ? "text-white" : "text-ink", className)}>
      <svg width="26" height="26" viewBox="0 0 28 28" aria-hidden="true">
        <rect x="3" y="15" width="5" height="10" rx="1" fill={bar} />
        <rect x="11.5" y="9" width="5" height="16" rx="1" fill={bar} />
        <rect x="20" y="3" width="5" height="22" rx="1" fill={accent} />
      </svg>
      <span className="text-[17px] font-semibold tracking-[-0.01em]">Mis Finanzas</span>
    </span>
  );
}
