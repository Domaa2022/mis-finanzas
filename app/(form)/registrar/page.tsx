import type { Metadata } from "next";
import { Suspense } from "react";
import { FormSkeleton } from "@/components/skeletons/Skeletons";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { safeNext } from "@/lib/auth/paths";
import { getAccounts, getCategories, getProfile } from "@/lib/data/core";
import { getLastUsedAccountId } from "@/lib/data/transactions";

export const metadata: Metadata = { title: "Registrar gasto" };

export default function RegisterPage({ searchParams }: PageProps<"/registrar">) {
  return (
    <>
      <PageHeader
        title="Registrar gasto"
        subtitle="Anota en qué se fue el dinero y de qué cuenta salió."
        back={{ href: "/", label: "Inicio", close: true }}
      />
      <Suspense
        fallback={
          <Sheet>
            <FormSkeleton fields={5} />
          </Sheet>
        }
      >
        <RegisterForm searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function RegisterForm({ searchParams }: { searchParams: PageProps<"/registrar">["searchParams"] }) {
  const params = await searchParams;
  const kind = params.tipo === "ingreso" ? "income" : "expense";
  const returnTo = safeNext(typeof params.volver === "string" ? params.volver : null);

  const [accounts, categories, lastUsed, { today }] = await Promise.all([
    getAccounts(),
    getCategories(),
    getLastUsedAccountId(kind),
    getProfile(),
  ]);
  const requested = typeof params.cuenta === "string" ? params.cuenta : null;
  const defaultAccountId = [requested, lastUsed].find((id) => id && accounts.some((a) => a.id === id)) ?? null;

  return (
    <TransactionForm
      accounts={accounts.map((a) => ({ id: a.id, name: a.name, currency: a.currency, balance_cents: a.balance_cents }))}
      expenseCategories={categories.filter((c) => c.kind === "expense")}
      incomeCategories={categories.filter((c) => c.kind === "income")}
      defaultAccountId={defaultAccountId}
      defaultKind={kind}
      today={today}
      returnTo={returnTo}
    />
  );
}
