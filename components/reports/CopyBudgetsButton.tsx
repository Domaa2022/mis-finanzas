"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { copyPreviousBudgets } from "@/lib/actions/budgets";

export function CopyBudgetsButton({ month }: { month: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-1.5">
      <Button
        variant="secondary"
        size="md"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await copyPreviousBudgets(month);
            setMessage(r.ok ? null : r.error);
          })
        }
      >
        Copiar los del mes anterior
      </Button>
      {message && (
        <p role="status" className="text-[13px] text-ink-3">
          {message}
        </p>
      )}
    </div>
  );
}
