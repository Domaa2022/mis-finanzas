import { z } from "zod";
import { isISODate } from "@/lib/dates";
import type { CurrencyCode } from "@/lib/supabase/database.types";

/**
 * Convierte centavos entre monedas con la tasa "lempiras por 1 dólar" (regla 2).
 * Igual que la función SQL `convert_cents`: redondea al centavo más cercano.
 */
export function convertCents(amountCents: number, from: CurrencyCode, to: CurrencyCode, rate: number | null): number {
  if (from === to) return amountCents;
  if (!rate || rate <= 0) throw new RangeError("Falta la tasa de cambio");
  const r = Math.round(rate * 10_000) / 10_000;
  return from === "HNL" ? roundHalfAwayFromZero(amountCents / r) : roundHalfAwayFromZero(amountCents * r);
}

/** Igual que `round()` de Postgres para numeric: .5 se aleja de cero. */
function roundHalfAwayFromZero(x: number): number {
  return Math.sign(x) * Math.round(Math.abs(x) + Number.EPSILON * Math.abs(x));
}

/** Lee la tasa escrita por la persona ("24.65"). Hasta 4 decimales. */
export function parseRate(input: string): number | null {
  const raw = input.trim().replace(",", ".");
  if (!/^\d{1,4}(\.\d{1,4})?$/.test(raw)) return null;
  const n = Number(raw);
  return n > 0 ? n : null;
}

export const transferSchema = z
  .object({
    fromAccountId: z.uuid("Elige la cuenta de origen"),
    toAccountId: z.uuid("Elige la cuenta de destino"),
    amount: z.number({ error: "Escribe un monto" }).int().positive("El monto debe ser mayor que cero"),
    /** Solo si las monedas difieren. */
    exchangeRate: z.number().positive("Escribe una tasa válida").nullable(),
    occurredOn: z.string().refine(isISODate, "Elige una fecha válida"),
    note: z.string().trim().max(200, "Usa como máximo 200 caracteres"),
  })
  .refine((v) => v.fromAccountId !== v.toAccountId, {
    message: "Elige dos cuentas distintas",
    path: ["toAccountId"],
  });

export type TransferInput = z.infer<typeof transferSchema>;
