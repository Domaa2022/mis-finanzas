import { ChartNoAxesColumn, CreditCard, House, List, Repeat, Target, User, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const REGISTER_EXPENSE_HREF = "/registrar";

const inicio: NavItem = { href: "/", label: "Inicio", icon: House };
const movimientos: NavItem = { href: "/movimientos", label: "Movimientos", icon: List };
const cuentas: NavItem = { href: "/cuentas", label: "Mis cuentas", icon: CreditCard };
const ahorros: NavItem = { href: "/ahorros", label: "Ahorros", icon: Target };
const gastosFijos: NavItem = { href: "/gastos-fijos", label: "Gastos fijos", icon: Repeat };
const reportes: NavItem = { href: "/reportes", label: "Reportes", icon: ChartNoAxesColumn };
const perfil: NavItem = { href: "/perfil", label: "Perfil", icon: User };

/** Menú lateral (≥ 1024 px). */
export const SIDEBAR_ITEMS: NavItem[] = [inicio, movimientos, cuentas, ahorros, gastosFijos, reportes, perfil];

/** Barra inferior (< 1024 px): dos a cada lado del botón central "Registrar gasto". */
export const BOTTOM_NAV_LEFT: NavItem[] = [inicio, movimientos];
export const BOTTOM_NAV_RIGHT: NavItem[] = [ahorros, perfil];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
