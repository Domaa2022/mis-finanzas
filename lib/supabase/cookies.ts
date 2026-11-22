import type { CookieOptions } from "@supabase/ssr";

/**
 * Si la persona no marcó "Mantener la sesión iniciada", las cookies de sesión
 * se guardan sin fecha de vencimiento: el navegador las borra al cerrarse.
 * Las cookies que se eliminan (maxAge 0) se respetan siempre.
 */
export function withRememberPreference(options: CookieOptions, remember: boolean): CookieOptions {
  if (remember || options.maxAge === 0) return options;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { maxAge, expires, ...rest } = options;
  return rest;
}
