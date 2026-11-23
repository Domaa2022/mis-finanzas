import type { Metadata } from "next";
import { Bell, CalendarClock, PartyPopper, TriangleAlert, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { NotificationActions } from "@/components/notifications/NotificationActions";
import { ListSkeleton } from "@/components/skeletons/Skeletons";
import { IconBadge } from "@/components/ui/IconBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { getNotifications } from "@/lib/data/notifications";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const metadata: Metadata = { title: "Notificaciones" };

const KIND: Record<string, { icon: LucideIcon; color: string }> = {
  savings_skipped: { icon: TriangleAlert, color: "#B45309" },
  charge_pending: { icon: TriangleAlert, color: "#B45309" },
  savings_reminder: { icon: CalendarClock, color: "#334155" },
  charge_reminder: { icon: CalendarClock, color: "#334155" },
  goal_completed: { icon: PartyPopper, color: "#0F766E" },
};

export default function NotificationsPage() {
  return (
    <>
      <PageHeader title="Notificaciones" back={{ href: "/", label: "Inicio" }} />
      <Sheet>
        <Suspense fallback={<ListSkeleton rows={4} />}>
          <Notifications />
        </Suspense>
      </Sheet>
    </>
  );
}

async function Notifications() {
  const items = await getNotifications();
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <Bell aria-hidden size={28} strokeWidth={1.75} className="text-faint" />
        <span className="text-base font-semibold">No tienes notificaciones</span>
        <span className="max-w-sm text-sm leading-normal text-ink-3">
          Aquí verás los recordatorios de tus aportes y cobros, y los avisos cuando algo no se pueda procesar.
        </span>
      </div>
    );
  }
  const unread = items.some((n) => !n.read_at);
  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <NotificationActions hasUnread={unread} />
      <ul className="m-0 list-none p-0">
        {items.map((n) => {
          const kind = KIND[n.kind] ?? { icon: Bell, color: "#334155" };
          const body = (
            <>
              <IconBadge icon={kind.icon} color={kind.color} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={cn("text-[15px]", n.read_at ? "font-medium" : "font-semibold")}>
                  {!n.read_at && <span className="sr-only">Sin leer: </span>}
                  {n.title}
                </span>
                <span className="text-[13px] leading-snug text-ink-3">{n.body}</span>
                <span className="font-mono text-xs text-muted">
                  {format(new Date(n.created_at), "d MMM, HH:mm", { locale: es }).replace(".", "")}
                </span>
              </span>
              {!n.read_at && <span aria-hidden className="mt-1.5 size-2 flex-none rounded-full bg-primary" />}
            </>
          );
          return (
            <li key={n.id} className="border-b border-surface-2 last:border-0">
              {n.href ? (
                <Link href={n.href} className="flex items-start gap-3 py-3.5 text-ink hover:text-ink">
                  {body}
                </Link>
              ) : (
                <div className="flex items-start gap-3 py-3.5">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
