import type { Metadata } from "next";
import { AccountForm } from "@/components/accounts/AccountForm";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Nueva cuenta" };

export default function NewAccountPage() {
  return (
    <>
      <PageHeader
        title="Nueva cuenta"
        subtitle="Agrega una cuenta bancaria, tarjeta o efectivo."
        back={{ href: "/cuentas", label: "Mis cuentas", close: true }}
      />
      <AccountForm mode="create" />
    </>
  );
}
