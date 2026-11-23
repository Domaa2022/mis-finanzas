/** Contenido que recibe el service worker (`public/sw.js`). */
export type PushPayload = { title: string; body: string; url: string; tag: string };

export function buildPushPayload(n: { id: string; title: string; body: string; href: string | null; kind: string }): PushPayload {
  const url = n.href && n.href.startsWith("/") && !n.href.startsWith("//") ? n.href : "/notificaciones";
  return { title: n.title, body: n.body, url, tag: `${n.kind}:${n.id}` };
}

/** Las suscripciones que el servicio de push da por vencidas se borran. */
export function isGoneStatus(status: number | undefined): boolean {
  return status === 404 || status === 410;
}
