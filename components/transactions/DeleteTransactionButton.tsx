"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { deleteTransaction } from "@/lib/actions/transactions";
import { deleteTransfer } from "@/lib/actions/transfers";

/**
 * Borra un gasto o ingreso después de confirmar. Con `transferId` borra la
 * transferencia completa (sus dos movimientos).
 */
export function DeleteTransactionButton({ id, label, transferId }: { id: string; label: string; transferId?: string | null }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      aria-label={`Eliminar ${label}`}
      disabled={pending}
      onClick={() => {
        const message = transferId
          ? `¿Eliminar "${label}"? Se deshará en las dos cuentas.`
          : `¿Eliminar "${label}"? El saldo de la cuenta se ajustará.`;
        if (!window.confirm(message)) return;
        startTransition(async () => {
          const result = transferId ? await deleteTransfer(transferId) : await deleteTransaction(id);
          if (!result.ok) window.alert(result.error);
        });
      }}
      className="inline-flex size-10 flex-none cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-50"
    >
      <Trash2 aria-hidden size={18} strokeWidth={1.75} />
    </button>
  );
}
