import type { Metadata } from "next";
import { Suspense } from "react";
import { FormSkeleton } from "@/components/skeletons/Skeletons";
import { TransferForm } from "@/components/transfers/TransferForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { accountSubtitle } from "@/lib/accounts/schema";
import { getAccounts, getProfile } from "@/lib/data/core";

export const metadata: Metadata = { title: "Transferir" };

export default function TransferPage({ searchParams }: PageProps<"/transferir">) {
  return (
    <>
      <PageHeader
        title="Transferir"
        subtitle="Mueve dinero entre tus cuentas."
        back={{ href: "/cuentas", label: "Mis cuentas", close: true }}
      />
      <Suspense
        fallback={
          <Sheet>
            <FormSkeleton fields={4} />
          </Sheet>
        }
      >
        <Transfer searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Transfer({ searchParams }: { searchParams: PageProps<"/transferir">["searchParams"] }) {
  const [{ desde }, accounts, { today }] = await Promise.all([searchParams, getAccounts(), getProfile()]);
  const defaultFrom = typeof desde === "string" && accounts.some((a) => a.id === desde) ? desde : null;
  return (
    <TransferForm
      today={today}
      defaultFrom={defaultFrom}
      accounts={accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        bank: accountSubtitle(a.bank_name, a.type),
        currency: a.currency,
        color: a.color,
        balance_cents: a.balance_cents,
      }))}
    />
  );
}
