import { Banknote, CreditCard, Landmark, LayoutGrid, PiggyBank, type LucideIcon } from "lucide-react";

export type AccountType = "savings" | "checking" | "credit_card" | "cash";

export const ACCOUNT_TYPE_META: Record<AccountType, { label: string; shortLabel: string; icon: LucideIcon }> = {
  savings: { label: "Cuenta de ahorro", shortLabel: "Ahorro", icon: PiggyBank },
  checking: { label: "Cuenta corriente", shortLabel: "Corriente", icon: Landmark },
  credit_card: { label: "Tarjeta de crédito", shortLabel: "Tarjeta", icon: CreditCard },
  cash: { label: "Efectivo", shortLabel: "Efectivo", icon: Banknote },
};

/** Ícono de la tarjeta "Todas las cuentas". */
export const ALL_ACCOUNTS_ICON = LayoutGrid;

/** Paleta de cuentas y categorías, en el orden de los diseños. */
export const ACCOUNT_COLORS = [
  { value: "#0F766E", name: "Verde azulado" },
  { value: "#1D4ED8", name: "Azul" },
  { value: "#6D28D9", name: "Morado" },
  { value: "#334155", name: "Pizarra" },
  { value: "#A16207", name: "Ocre" },
  { value: "#BE185D", name: "Fucsia" },
] as const;

export type AccountColor = (typeof ACCOUNT_COLORS)[number]["value"];
