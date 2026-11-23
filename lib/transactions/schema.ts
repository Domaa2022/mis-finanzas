import { z } from "zod";
import { isISODate } from "@/lib/dates";

export const transactionSchema = z.object({
  kind: z.enum(["expense", "income"]),
  amount: z
    .number({ error: "Escribe un monto" })
    .int()
    .positive("El monto debe ser mayor que cero")
    .max(99_999_999_999, "El monto es demasiado grande"),
  categoryId: z.uuid("Elige una categoría"),
  accountId: z.uuid("Elige una cuenta"),
  occurredOn: z.string().refine(isISODate, "Elige una fecha válida"),
  note: z.string().trim().max(200, "Usa como máximo 200 caracteres"),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
