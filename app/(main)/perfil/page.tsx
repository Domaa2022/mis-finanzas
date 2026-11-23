import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, LogOut } from "lucide-react";
import { Suspense } from "react";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { PushToggle } from "@/components/profile/PushToggle";
import { FormSkeleton } from "@/components/skeletons/Skeletons";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { signOut } from "@/lib/auth/actions";
import { db, getProfile } from "@/lib/data/core";

export const metadata: Metadata = { title: "Perfil" };

const LINKS = [
  { href: "/cuentas", label: "Mis cuentas" },
  { href: "/presupuestos", label: "Presupuestos" },
  { href: "/gastos-fijos", label: "Gastos fijos" },
  { href: "/notificaciones", label: "Notificaciones" },
];

export default function ProfilePage() {
  return (
    <>
      <PageHeader
        title="Perfil"
        subtitle={
          <Suspense fallback={<span className="invisible">correo</span>}>
            <Email />
          </Suspense>
        }
      />
      <Sheet className="gap-8 lg:max-w-2xl">
        <section aria-labelledby="datos" className="flex flex-col gap-4">
          <h2 id="datos" className="text-[17px] font-semibold tracking-[-0.01em] lg:text-lg">
            Tus datos
          </h2>
          <Suspense fallback={<FormSkeleton fields={2} />}>
            <ProfileData />
          </Suspense>
        </section>

        <section aria-labelledby="avisos" className="flex flex-col gap-3">
          <h2 id="avisos" className="text-[17px] font-semibold tracking-[-0.01em] lg:text-lg">
            Notificaciones
          </h2>
          <PushToggle />
        </section>

        <nav aria-label="Atajos" className="flex flex-col lg:hidden">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="flex min-h-12 items-center justify-between border-b border-surface-2 text-[15px] text-ink hover:text-ink">
              {l.label}
              <ChevronRight aria-hidden size={18} className="text-faint" />
            </Link>
          ))}
        </nav>

        <form action={signOut}>
          <button
            type="submit"
            className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-[14px] border border-line px-4 py-3 text-left text-[15px] font-semibold text-ink hover:border-line-strong"
          >
            <LogOut aria-hidden size={20} strokeWidth={1.75} />
            Cerrar sesión
          </button>
        </form>
      </Sheet>
    </>
  );
}

async function Email() {
  const { user } = await db();
  return <>{user.email}</>;
}

async function ProfileData() {
  const [{ supabase, user }, profile] = await Promise.all([db(), getProfile()]);
  const { data } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  return <ProfileForm displayName={data?.display_name ?? profile.displayName} timezone={profile.timezone} />;
}
