"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { Suspense } from "react";
import { cn } from "@/lib/cn";
import { BOTTOM_NAV_LEFT, BOTTOM_NAV_RIGHT, REGISTER_EXPENSE_HREF, isActive, type NavItem } from "./nav";

function NavLink({ item, pathname }: { item: NavItem; pathname: string | null }) {
  const active = pathname !== null && isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 flex-col items-center justify-end gap-1 text-[11px]",
        active ? "font-semibold text-ink hover:text-ink" : "font-medium text-muted hover:text-ink",
      )}
    >
      <Icon aria-hidden size={22} strokeWidth={active ? 1.9 : 1.75} />
      {item.label}
    </Link>
  );
}

/** Barra de navegación inferior para móvil con el botón central "Registrar gasto". */
export function BottomNav({ className }: { className?: string }) {
  return (
    <Suspense fallback={<BottomNavBar pathname={null} className={className} />}>
      <ActiveBottomNav className={className} />
    </Suspense>
  );
}

function ActiveBottomNav({ className }: { className?: string }) {
  return <BottomNavBar pathname={usePathname()} className={className} />;
}

function BottomNavBar({ pathname, className }: { pathname: string | null; className?: string }) {
  return (
    <nav
      aria-label="Navegación principal"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 grid grid-cols-[1fr_1fr_1.5fr_1fr_1fr] items-end border-t border-line bg-white px-2 pt-1.5",
        "h-[calc(74px+env(safe-area-inset-bottom))] pb-[calc(14px+env(safe-area-inset-bottom))]",
        className,
      )}
    >
      {BOTTOM_NAV_LEFT.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} />
      ))}

      <Link
        href={REGISTER_EXPENSE_HREF}
        aria-current={pathname !== null && isActive(pathname, REGISTER_EXPENSE_HREF) ? "page" : undefined}
        className="group -mt-[26px] flex flex-col items-center gap-1"
      >
        <span className="box-content flex size-[54px] items-center justify-center rounded-full border-4 border-white bg-primary text-white ring-1 ring-line group-hover:bg-primary-dark">
          <Plus aria-hidden size={24} strokeWidth={2.25} />
        </span>
        <span className="text-[11px] font-bold whitespace-nowrap text-primary group-hover:text-primary-dark">
          Registrar gasto
        </span>
      </Link>

      {BOTTOM_NAV_RIGHT.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} />
      ))}
    </nav>
  );
}
