import Link from "next/link";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { IconBadge } from "@/components/ui/IconBadge";
import { Money } from "@/components/ui/Money";
import { ACCOUNT_TYPE_META } from "@/lib/accounts/meta";
import { accountSubtitle } from "@/lib/accounts/schema";
import type { AccountWithBalance } from "@/lib/data/core";
import { CURRENCY_NAME } from "@/lib/money";

/** Lista de cuentas: filas con enlace en móvil, tabla en web (diseños `Mis-cuentas` y `Web-cuentas`). */
export function AccountList({ accounts }: { accounts: AccountWithBalance[] }) {
  return (
    <>
      <ul className="m-0 flex list-none flex-col p-0 lg:hidden">
        {accounts.map((a) => (
          <li key={a.id} className="border-b border-surface-2 last:border-0">
            <Link href={`/cuentas/${a.id}`} className="flex items-center gap-3.5 py-3.5 text-ink hover:text-ink">
              <IconBadge icon={ACCOUNT_TYPE_META[a.type].icon} color={a.color} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[15px] font-semibold">{a.name}</span>
                <span className="truncate text-[13px] text-ink-3">
                  {accountSubtitle(a.bank_name, a.type, CURRENCY_NAME[a.currency])}
                  {a.include_in_total ? "" : " · Fuera del total"}
                </span>
              </span>
              <Money cents={a.balance_cents} currency={a.currency} className="text-[15px]" />
              <ChevronRight aria-hidden size={18} className="flex-none text-faint" />
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-[14px] border border-line lg:block">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-surface text-left text-ink-3">
              <th className="px-4 py-3 font-medium">Cuenta</th>
              <th className="px-4 py-3 font-medium">Banco</th>
              <th className="px-4 py-3 font-medium">Moneda</th>
              <th className="px-4 py-3 text-right font-medium">Saldo</th>
              <th className="px-2 py-3">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-t border-surface-2">
                <td className="px-4 py-3.5">
                  <span className="flex items-center gap-3">
                    <IconBadge icon={ACCOUNT_TYPE_META[a.type].icon} color={a.color} size="md" />
                    <span className="flex flex-col">
                      <span className="font-semibold">{a.name}</span>
                      {!a.include_in_total && <span className="text-xs text-muted">Fuera del total</span>}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3.5 text-ink-2">{accountSubtitle(a.bank_name, a.type)}</td>
                <td className="px-4 py-3.5 text-ink-2">{CURRENCY_NAME[a.currency]}</td>
                <td className="px-4 py-3.5 text-right">
                  <Money cents={a.balance_cents} currency={a.currency} className="text-[15px]" />
                </td>
                <td className="w-[52px] px-2 py-1.5 text-right">
                  <Link
                    href={`/cuentas/${a.id}`}
                    aria-label={`Editar ${a.name}`}
                    className="inline-flex size-10 items-center justify-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"
                  >
                    <MoreHorizontal aria-hidden size={20} strokeWidth={1.75} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
