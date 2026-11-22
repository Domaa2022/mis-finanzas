/** Rutas que no requieren sesión. */
export const PUBLIC_PATHS = ["/login", "/registro", "/recuperar", "/auth"] as const;

/** Rutas de autenticación de las que se saca a quien ya tiene sesión. */
export const GUEST_ONLY_PATHS = ["/login", "/registro", "/recuperar"] as const;

function matches(pathname: string, paths: readonly string[]) {
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isPublicPath(pathname: string): boolean {
  // El catálogo /dev/ui no tiene datos privados y solo existe en desarrollo.
  if (process.env.NODE_ENV !== "production" && matches(pathname, ["/dev"])) return true;
  return matches(pathname, PUBLIC_PATHS);
}

export function isGuestOnlyPath(pathname: string): boolean {
  return matches(pathname, GUEST_ONLY_PATHS);
}

/**
 * Valida el destino después de iniciar sesión. Solo acepta rutas internas
 * para evitar redirecciones abiertas ("//sitio.com", "https://…").
 */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (isGuestOnlyPath(next.split("?")[0])) return fallback;
  return next;
}

/** Cookie que guarda si la persona marcó "Mantener la sesión iniciada". */
export const REMEMBER_COOKIE = "mf_remember";
