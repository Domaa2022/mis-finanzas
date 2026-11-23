import type { Metadata } from "next";
import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { getCurrentUser } from "@/lib/data/user";
import { signOut } from "@/lib/auth/actions";

export const metadata: Metadata = { title: "Perfil" };

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Perfil" />
      <Sheet>
        <Suspense fallback={<div className="h-20 animate-pulse rounded-[14px] bg-surface-2" />}>
          <ProfileDetails />
        </Suspense>
        <form action={signOut}>
          <button
            type="submit"
            className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-[14px] border border-line px-4 py-3 text-left text-[15px] font-semibold text-ink hover:border-line-strong lg:max-w-md"
          >
            <LogOut aria-hidden size={20} strokeWidth={1.75} />
            Cerrar sesión
          </button>
        </form>
      </Sheet>
    </>
  );
}

async function ProfileDetails() {
  const user = await getCurrentUser();
  return (
    <dl className="flex flex-col gap-1 rounded-[14px] bg-surface px-5 py-4 lg:max-w-md">
      <dt className="sr-only">Correo</dt>
      <dd className="text-[15px] font-semibold">{user.email}</dd>
    </dl>
  );
}
