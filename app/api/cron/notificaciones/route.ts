import { NextResponse, type NextRequest } from "next/server";
import { runJobs, sendPendingPush } from "@/lib/push/send";

/**
 * Tarea programada (cada hora): corre los jobs de ahorro y cobros —por si pg_cron
 * no está disponible; son idempotentes— y envía por push las notificaciones nuevas.
 *
 * Protegida con `Authorization: Bearer <CRON_SECRET>` (Vercel Cron lo envía solo).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const jobs = await runJobs();
    const push = await sendPendingPush();
    return NextResponse.json({ ok: true, jobs, push });
  } catch (error) {
    console.error("cron/notificaciones", error);
    return NextResponse.json({ ok: false, error: "Falló la tarea programada" }, { status: 500 });
  }
}
