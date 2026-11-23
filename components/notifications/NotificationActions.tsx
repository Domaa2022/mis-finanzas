"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { clearNotifications, markAllNotificationsRead } from "@/lib/actions/notifications";

export function NotificationActions({ hasUnread }: { hasUnread: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      {hasUnread && (
        <Button variant="secondary" size="md" disabled={pending} onClick={() => startTransition(async () => void (await markAllNotificationsRead()))}>
          Marcar todas como leídas
        </Button>
      )}
      <Button
        variant="ghost"
        size="md"
        disabled={pending}
        onClick={() => {
          if (window.confirm("¿Borrar todas las notificaciones?")) startTransition(async () => void (await clearNotifications()));
        }}
      >
        Borrar todas
      </Button>
    </div>
  );
}
