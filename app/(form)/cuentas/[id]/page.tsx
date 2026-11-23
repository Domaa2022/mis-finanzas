import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { AccountForm } from "@/components/accounts/AccountForm";
import { FormSkeleton } from "@/components/skeletons/Skeletons";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { bankFieldsFrom, type AccountInput } from "@/lib/accounts/schema";
import { getAccounts } from "@/lib/data/core";

export const metadata: Metadata = { title: "Editar cuenta" };

export default function EditAccountPage({ params }: PageProps<"/cuentas/[id]">) {
  return (
    <>
      <PageHeader
        title="Editar cuenta"
        subtitle="Cambia los datos o archiva la cuenta."
        back={{ href: "/cuentas", label: "Mis cuentas", close: true }}
      />
      <Suspense
        fallback={
          <Sheet>
            <FormSkeleton fields={5} />
          </Sheet>
        }
      >
        <EditAccount params={params} />
      </Suspense>
    </>
  );
}

async function EditAccount({ params }: { params: PageProps<"/cuentas/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const accounts = await getAccounts(true);
  const account = accounts.find((a) => a.id === id);
  if (!account) notFound();
  // La deuda en la otra moneda de una tarjeta se edita desde la tarjeta principal.
  if (account.paired_account_id) redirect(`/cuentas/${account.paired_account_id}`);
  const pair = accounts.find((a) => a.paired_account_id === account.id);

  const values: AccountInput = {
    type: account.type,
    name: account.name,
    ...bankFieldsFrom(account.bank_name),
    currency: account.currency,
    balance: account.type === "credit_card" ? -account.balance_cents : account.balance_cents,
    color: account.color.toUpperCase() as AccountInput["color"],
    includeInTotal: account.include_in_total,
    dualCurrency: Boolean(pair),
    otherBalance: pair ? -pair.balance_cents : 0,
  };

  return <AccountForm mode="edit" accountId={account.id} defaultValues={values} archived={Boolean(account.archived_at)} />;
}
