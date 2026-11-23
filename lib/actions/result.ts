/** Resultado común de las acciones de servidor. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const fail = (error: string, fieldErrors?: Record<string, string>): ActionResult<never> => ({
  ok: false,
  error,
  fieldErrors,
});

export const INVALID_FORM = "Revisa los datos del formulario.";

/** Traduce errores de Postgres/PostgREST a mensajes para la persona. */
export function dbErrorMessage(error: { code?: string; message?: string } | null | undefined): string {
  const message = error?.message ?? "";
  // Errores lanzados a propósito por las funciones SQL (raise exception … using errcode = 'P0001').
  if (error?.code === "P0001" && message) return message;
  switch (error?.code) {
    case "23505":
      return "Ya existe un registro con ese nombre.";
    case "23503":
      return "Uno de los datos elegidos ya no existe. Recarga la página e intenta de nuevo.";
    case "23514":
      return "Algún valor no es válido. Revisa el formulario.";
    case "42501":
    case "PGRST301":
      return "Tu sesión terminó. Vuelve a iniciar sesión.";
    default:
      return "No pudimos guardar los cambios. Revisa tu conexión y vuelve a intentarlo.";
  }
}
