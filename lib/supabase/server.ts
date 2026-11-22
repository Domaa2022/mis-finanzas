import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { REMEMBER_COOKIE } from "@/lib/auth/paths";
import type { Database } from "./database.types";
import { withRememberPreference } from "./cookies";
import { getSupabaseEnv } from "./env";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 * Crea uno nuevo por petición: nunca lo guardes en una variable global.
 *
 * Con Cache Components activo, leer cookies() es un dato de petición: el
 * componente que lo use debe ir dentro de un <Suspense>.
 */
export async function createClient(options: { remember?: boolean } = {}) {
  const { url, key } = getSupabaseEnv();
  const cookieStore = await cookies();
  const remember = options.remember ?? cookieStore.get(REMEMBER_COOKIE)?.value !== "0";

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options: cookieOptions }) =>
            cookieStore.set(name, value, withRememberPreference(cookieOptions, remember)),
          );
        } catch {
          // Llamado desde un Server Component, donde no se pueden escribir
          // cookies. El proxy ya refrescó la sesión en esta petición.
        }
      },
    },
  });
}
