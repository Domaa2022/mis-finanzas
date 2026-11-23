import "server-only";
import { getRecurringSubtitle } from "./recurring";

/** Datos extra de Inicio que dependen de otras secciones. */
export async function getHomeExtras(): Promise<{ recurringSubtitle: string }> {
  return { recurringSubtitle: await getRecurringSubtitle() };
}
