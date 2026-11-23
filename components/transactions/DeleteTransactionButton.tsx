"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { deleteTransaction } from "@/lib/actions/transactions";

/** Borra un gasto o ingreso después de confirmar. */
export function DeleteTransactionButton({ id, label }: { id: string; label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      aria-label={`Eliminar ${label}`}
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`¿Eliminar "${label}"? El saldo de la cuenta se ajustará.`)) return;
        startTransition(async () => {
          const result = await deleteTransaction(id);
          if (!result.ok) window.alert(result.error);
        });
      }}
      className="inline-flex size-10 flex-none cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-50"
    >
      <Trash2 aria-hidden size={18} strokeWidth={1.75} />
    </button>
  );
}
