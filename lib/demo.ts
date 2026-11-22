/**
 * Datos de muestra para la Fase 0 (página de muestra y /dev/ui).
 * Se reemplazan por datos reales de Supabase en la Fase 2.
 */
import type { AccountType } from "./accounts/meta";
import type { Currency } from "./money";

export type DemoAccount = {
  id: string;
  type: AccountType;
  name: string;
  bank: string;
  currency: Currency;
  color: string;
  balanceCents: number;
};

export const DEMO_MONTH = "Noviembre 2026";
export const DEMO_USER = "Ana";

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { id: "a1", type: "savings", name: "Cuenta de ahorro", bank: "Banco A", currency: "HNL", color: "#0F766E", balanceCents: 4_520_000 },
  { id: "a2", type: "checking", name: "Cuenta corriente", bank: "Banco B", currency: "HNL", color: "#1D4ED8", balanceCents: 1_235_050 },
  { id: "a3", type: "credit_card", name: "Tarjeta de crédito", bank: "Banco A", currency: "HNL", color: "#6D28D9", balanceCents: -318_975 },
  { id: "a4", type: "savings", name: "Ahorro en dólares", bank: "Banco B", currency: "USD", color: "#334155", balanceCents: 125_000 },
  { id: "a5", type: "cash", name: "Efectivo", bank: "Billetera", currency: "HNL", color: "#A16207", balanceCents: 85_000 },
];
