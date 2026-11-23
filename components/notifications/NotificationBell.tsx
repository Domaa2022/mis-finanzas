import Link from "next/link";
import { Bell } from "lucide-react";
import { Suspense } from "react";
import { getUnreadCount } from "@/lib/data/notifications";

async function UnreadDot() {
  const count = await getUnreadCount();
  if (count === 0) return null;
  return (
    <>
      <span aria-hidden className="absolute top-2 right-2 size-2.5 rounded-full border-2 border-primary bg-white" />
      <span className="sr-only">, {count === 1 ? "1 sin leer" : `${count} sin leer`}</span>
    </>
  );
}

/** Campana de la franja roja con un punto si hay notificaciones sin leer. */
export function NotificationBell() {
  return (
    <Link
      href="/notificaciones"
      className="relative flex size-11 items-center justify-center rounded-full text-white hover:bg-white/10 hover:text-white"
    >
      <Bell aria-hidden size={22} strokeWidth={1.75} />
      <span className="sr-only">Notificaciones</span>
      <Suspense fallback={null}>
        <UnreadDot />
      </Suspense>
    </Link>
  );
}
