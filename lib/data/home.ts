import "server-only";

/** Datos extra de Inicio que dependen de otras secciones. */
export async function getHomeExtras(): Promise<{ recurringSubtitle: string }> {
  return { recurringSubtitle: "Suscripciones y pagos" };
}
