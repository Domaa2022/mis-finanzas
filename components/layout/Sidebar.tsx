"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { Suspense } from "react";
import { cn } from "@/lib/cn";
import { Logo } from "./Logo";
import { REGISTER_EXPENSE_HREF, SIDEBAR_ITEMS, isActive } from "./nav";

/** Menú lateral de escritorio con la píldora "Registrar gasto" arriba. */
export function Sidebar({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "sticky top-0 h-dvh w-60 flex-none flex-col gap-7 overflow-y-auto border-r border-line bg-white px-4 py-7",
        className,
      )}
    >
      <Link href="/" className="px-3" aria-label="Mis Finanzas, ir a Inicio">
        <Logo />
      </Link>

      <Link
        href={REGISTER_EXPENSE_HREF}
        className="flex h-14 items-center gap-3 rounded-full bg-primary pr-5 pl-2 text-base font-semibold text-white hover:bg-primary-dark hover:text-white"
      >
        <span className="flex size-10 flex-none items-center justify-center rounded-full bg-white text-primary">
          <Plus aria-hidden size={22} strokeWidth={2.5} />
        </span>
        Registrar gasto
      </Link>

      <Suspense fallback={<SidebarNav pathname={null} />}>
        <ActiveSidebarNav />
      </Suspense>
    </aside>
  );
}

function ActiveSidebarNav() {
  return <SidebarNav pathname={usePathname()} />;
}

/** Enlaces del menú. Sin `pathname` (mientras carga) ninguno aparece activo. */
function SidebarNav({ pathname }: { pathname: string | null }) {
  return (
      <nav aria-label="Navegación principal" className="flex flex-col gap-1">
        {SIDEBAR_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname !== null && isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-[15px]",
                active
                  ? "bg-primary-soft font-semibold text-primary hover:text-primary"
                  : "font-medium text-ink-2 hover:bg-surface hover:text-ink",
              )}
            >
              <Icon aria-hidden size={20} strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </nav>
  );
}
