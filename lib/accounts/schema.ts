import { z } from "zod";
import { ACCOUNT_COLORS } from "./meta";

export const BANKS = [
  "Banco Atlántida",
  "BAC Credomatic",
  "Banpaís",
  "Banco Ficohsa",
  "Davivienda",
  "Banco de Occidente",
  "Banrural",
  "Banco Promerica",
  "Banco Lafise",
  "Banco Azteca",
] as const;

/** Valores especiales del selector de banco. */
export const BANK_OTHER = "__otro";
export const BANK_NONE = "__ninguno";

const colorValues = ACCOUNT_COLORS.map((c) => c.value) as [string, ...string[]];

export const accountSchema = z
  .object({
    type: z.enum(["savings", "checking", "credit_card", "cash"]),
    name: z.string().trim().min(1, "Escribe un nombre").max(60, "Usa como máximo 60 caracteres"),
    bank: z.string(),
    otherBank: z.string().trim().max(60, "Usa como máximo 60 caracteres"),
    currency: z.enum(["HNL", "USD"]),
    /** Saldo actual en centavos. En tarjetas es lo que se debe (positivo en el formulario). */
    balance: z.number({ error: "Escribe un monto válido" }).int(),
    color: z.enum(colorValues),
    includeInTotal: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.type !== "cash" && v.bank === "") {
      ctx.addIssue({ code: "custom", path: ["bank"], message: "Elige un banco" });
    }
    if (v.bank === BANK_OTHER && v.otherBank === "") {
      ctx.addIssue({ code: "custom", path: ["otherBank"], message: "Escribe el nombre del banco" });
    }
    if (v.type === "credit_card" && v.balance < 0) {
      ctx.addIssue({ code: "custom", path: ["balance"], message: "Escribe lo que debes como un monto positivo" });
    }
  });

export type AccountInput = z.infer<typeof accountSchema>;

/** Nombre del banco a guardar (null para efectivo o sin banco). */
export function bankNameFrom(input: Pick<AccountInput, "bank" | "otherBank">): string | null {
  if (input.bank === BANK_OTHER) return input.otherBank.trim() || null;
  if (input.bank === "" || input.bank === BANK_NONE) return null;
  return input.bank;
}

/** Saldo inicial a guardar: en tarjetas de crédito la deuda se guarda en negativo. */
export function initialBalanceFrom(type: AccountInput["type"], balanceCents: number): number {
  return type === "credit_card" ? -Math.abs(balanceCents) : balanceCents;
}

/** Valores del formulario a partir de una cuenta guardada (para editar). */
export function bankFieldsFrom(bankName: string | null): Pick<AccountInput, "bank" | "otherBank"> {
  if (!bankName) return { bank: BANK_NONE, otherBank: "" };
  if ((BANKS as readonly string[]).includes(bankName)) return { bank: bankName, otherBank: "" };
  return { bank: BANK_OTHER, otherBank: bankName };
}

/** Subtítulo de una cuenta: "BAC Credomatic · Lempiras", "Billetera · Lempiras". */
export function accountSubtitle(bankName: string | null, type: string, currencyName?: string): string {
  const bank = bankName ?? (type === "cash" ? "Billetera" : "Sin banco");
  return currencyName ? `${bank} · ${currencyName}` : bank;
}
