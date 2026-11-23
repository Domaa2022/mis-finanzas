import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { sendNotification, WebPushError } from "web-push";
import type { Database } from "@/lib/supabase/database.types";
import { buildPushPayload, isGoneStatus } from "./payload";

/**
 * Cliente con la service role key: salta RLS. Solo para tareas programadas
 * en el servidor; nunca se expone al navegador.
 */
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY para las tareas programadas.");
  return createSupabaseClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function vapid() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:notificaciones@example.com";
  if (!publicKey || !privateKey) return null;
  return { subject, publicKey, privateKey };
}

/** Ejecuta los jobs (idempotentes) por si pg_cron no está disponible. */
export async function runJobs() {
  const { data, error } = await adminClient().rpc("run_daily_jobs");
  if (error) throw error;
  return data;
}

/** Envía por push las notificaciones nuevas de las últimas 24 h y las marca como enviadas. */
export async function sendPendingPush(): Promise<{ sent: number; failed: number; skipped?: string }> {
  const details = vapid();
  if (!details) return { sent: 0, failed: 0, skipped: "Faltan las claves VAPID" };
  const supabase = adminClient();

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: pending, error } = await supabase
    .from("notifications")
    .select("id, user_id, kind, title, body, href")
    .is("pushed_at", null)
    .gte("created_at", since)
    .limit(500);
  if (error) throw error;
  if (!pending?.length) return { sent: 0, failed: 0 };

  const userIds = [...new Set(pending.map((n) => n.user_id))];
  const { data: subs, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);
  if (subsError) throw subsError;
  const byUser = new Map<string, { id: string; endpoint: string; p256dh: string; auth: string }[]>();
  for (const s of subs ?? []) {
    byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]);
  }

  let sent = 0;
  let failed = 0;
  const gone = new Set<string>();
  for (const n of pending) {
    const payload = JSON.stringify(buildPushPayload(n));
    for (const s of byUser.get(n.user_id) ?? []) {
      if (gone.has(s.id)) continue;
      try {
        await sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          vapidDetails: details,
          TTL: 60 * 60 * 12,
        });
        sent++;
      } catch (e) {
        failed++;
        if (e instanceof WebPushError && isGoneStatus(e.statusCode)) gone.add(s.id);
      }
    }
  }

  await supabase
    .from("notifications")
    .update({ pushed_at: new Date().toISOString() })
    .in(
      "id",
      pending.map((n) => n.id),
    );
  if (gone.size) await supabase.from("push_subscriptions").delete().in("id", [...gone]);
  return { sent, failed };
}
