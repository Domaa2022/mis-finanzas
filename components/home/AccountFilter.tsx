"use client";

import { ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { AccountTile } from "@/components/ui/AccountTile";
import { cn } from "@/lib/cn";
import type { AccountType } from "@/lib/accounts/meta";
import type { CurrencyCode } from "@/lib/supabase/database.types";

export type FilterAccount = {
  id: string;
  type: AccountType;
  name: string;
  subtitle: string;
  currency: CurrencyCode;
  color: string;
  balance_cents: number;
  /** Deuda en la otra moneda de una tarjeta bimoneda. */
  extra: { cents: number; currency: CurrencyCode } | null;
};

function useAccountParam() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const selected = params.get("cuenta") ?? "all";

  const select = (id: string) => {
    const next = new URLSearchParams(params);
    if (id === "all") next.delete("cuenta");
    else next.set("cuenta", id);
    const query = next.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  };
  return { selected, select, pending };
}

/** Píldora "Todas las cuentas" de la franja roja: un select nativo con apariencia de píldora. */
export function AccountPill({ accounts, className }: { accounts: FilterAccount[]; className?: string }) {
  const { selected, select } = useAccountParam();
  const current = accounts.find((a) => a.id === selected);
  return (
    <label
      className={cn(
        "relative flex h-11 cursor-pointer items-center gap-2 self-start rounded-full border border-white/35 bg-white/12 pr-3.5 pl-4 text-[15px] font-medium text-white",
        "has-[select:focus-visible]:outline-2 has-[select:focus-visible]:outline-offset-2 has-[select:focus-visible]:outline-white",
        className,
      )}
    >
      <span className="sr-only">Ver movimientos de</span>
      <span className="max-w-48 truncate">{current?.name ?? "Todas las cuentas"}</span>
      <ChevronDown aria-hidden size={18} strokeWidth={2} />
      <select
        value={selected}
        onChange={(e) => select(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        <option value="all">Todas las cuentas</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Fila (móvil) o cuadrícula (web) de tarjetas de cuenta que filtran Inicio. */
export function AccountTiles({
  accounts,
  allTotal,
  allUsdTotal,
}: {
  accounts: FilterAccount[];
  allTotal: number;
  allUsdTotal: number | null;
}) {
  const { selected, select, pending } = useAccountParam();
  return (
    <div
      aria-busy={pending}
      className="flex gap-2.5 overflow-x-auto px-6 pb-1 lg:grid lg:grid-cols-[repeat(auto-fill,minmax(168px,1fr))] lg:gap-3 lg:overflow-visible lg:px-0 lg:pb-0"
    >
      <AccountTile
        type="all"
        name="Todas"
        subtitle={accounts.length === 1 ? "1 cuenta" : `${accounts.length} cuentas`}
        balanceCents={allTotal}
        currency="HNL"
        extraBalance={allUsdTotal !== null ? { cents: allUsdTotal, currency: "USD" } : undefined}
        selected={selected === "all"}
        onSelect={() => select("all")}
        className="w-[132px] flex-none lg:w-auto"
      />
      {accounts.map((a) => (
        <AccountTile
          key={a.id}
          type={a.type}
          name={a.name}
          subtitle={a.subtitle}
          balanceCents={a.balance_cents}
          currency={a.currency}
          color={a.color}
          extraBalance={a.extra ?? undefined}
          selected={selected === a.id}
          onSelect={() => select(a.id)}
          className="w-[132px] flex-none lg:w-auto"
        />
      ))}
    </div>
  );
}
