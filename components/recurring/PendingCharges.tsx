"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { IconBadge } from "@/components/ui/IconBadge";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { confirmPending, dismissPending } from "@/lib/actions/recurring";
import { dayMonth } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { CurrencyCode } from "@/lib/supabase/database.types";

export type PendingView = {
  id: string;
  due_on: string;
  amount_cents: number;
  name: string;
  icon: string;
  color: string;
  account: string;
  currency: CurrencyCode;
  is_variable: boolean;
};

function PendingRow({ p }: { p: PendingView }) {
  const [amount, setAmount] = useState<number | null>(p.amount_cents);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputId = `pendiente-${p.id}`;

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) setError(r.error ?? "No pudimos guardar el cambio.");
    });

  return (
    <li className="flex flex-col gap-3 border-b border-warn-line/60 py-3.5 last:border-0">
      <div className="flex items-center gap-3">
        <IconBadge name={p.icon} color={p.color} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[15px] font-semibold">{p.name}</span>
          <span className="truncate text-[13px] text-ink-3">
            Cobro del {dayMonth(p.due_on)} · {p.account}
          </span>
        </span>
        {!p.is_variable && <span className="font-mono text-[15px] font-medium">{formatMoney(p.amount_cents, p.currency)}</span>}
      </div>
      {p.is_variable && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={inputId} className="text-[13px] text-ink-3">
            Monto real (estimado {formatMoney(p.amount_cents, p.currency)})
          </label>
          <MoneyInput id={inputId} currency={p.currency} value={amount} onValueChange={setAmount} />
        </div>
      )}
      {error && (
        <p role="alert" className="text-[13px] text-warn">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          size="md"
          disabled={pending || !amount}
          onClick={() => run(() => confirmPending(p.id, p.is_variable ? amount : null))}
        >
          Confirmar
        </Button>
        <Button size="md" variant="secondary" disabled={pending} onClick={() => run(() => dismissPending(p.id))}>
          Descartar
        </Button>
      </div>
    </li>
  );
}

/** Cobros que esperan confirmación (gastos fijos sin registro automático). */
export function PendingCharges({ items }: { items: PendingView[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="pendientes" className="rounded-xl border border-warn-line bg-warn-soft px-4 py-2 lg:max-w-2xl">
      <h2 id="pendientes" className="pt-2 text-[15px] font-semibold">
        {items.length === 1 ? "1 cobro por confirmar" : `${items.length} cobros por confirmar`}
      </h2>
      <ul className="m-0 list-none p-0">
        {items.map((p) => (
          <PendingRow key={p.id} p={p} />
        ))}
      </ul>
    </section>
  );
}
