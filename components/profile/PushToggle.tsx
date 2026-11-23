"use client";

import { useEffect, useState, useTransition } from "react";
import { Switch } from "@/components/ui/Switch";
import { deletePushSubscription, savePushSubscription } from "@/lib/actions/profile";

type State = "loading" | "unsupported" | "unconfigured" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/** Activa los avisos push (recordatorios de aportes y cobros) en este dispositivo. */
export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next: State;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) next = "unsupported";
      else if (!VAPID) next = "unconfigured";
      else if (Notification.permission === "denied") next = "denied";
      else {
        const reg = await navigator.serviceWorker.register("/sw.js");
        next = (await reg.pushManager.getSubscription()) ? "on" : "off";
      }
      if (!cancelled) setState(next);
    })().catch(() => !cancelled && setState("unsupported"));
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (enable: boolean) =>
    startTransition(async () => {
      setError(null);
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        if (enable) {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            setState(permission === "denied" ? "denied" : "off");
            return;
          }
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID!),
          });
          const r = await savePushSubscription(sub.toJSON());
          if (!r.ok) {
            await sub.unsubscribe();
            throw new Error(r.error);
          }
          setState("on");
        } else {
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            await deletePushSubscription(sub.endpoint);
            await sub.unsubscribe();
          }
          setState("off");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "No pudimos cambiar los avisos.");
      }
    });

  const hint: Record<State, string> = {
    loading: "Revisando este dispositivo…",
    unsupported: "Este navegador no admite notificaciones push. En iPhone, primero agrega la app a la pantalla de inicio.",
    unconfigured: "Las notificaciones push aún no están configuradas en el servidor.",
    denied: "Bloqueaste las notificaciones. Actívalas en la configuración del navegador.",
    off: "Recibe aquí los recordatorios de tus aportes y cobros.",
    on: "Recibirás aquí los recordatorios de tus aportes y cobros.",
  };

  return (
    <div className="flex flex-col gap-1">
      <Switch
        checked={state === "on"}
        disabled={pending || !(state === "on" || state === "off")}
        onCheckedChange={toggle}
        label={
          <span className="flex flex-col gap-0.5">
            <span className="font-medium">Avisos en este dispositivo</span>
            <span className="text-[13px] text-muted">{hint[state]}</span>
          </span>
        }
      />
      {error && (
        <p role="alert" className="text-[13px] text-warn">
          {error}
        </p>
      )}
    </div>
  );
}
