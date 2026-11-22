import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 * Crea uno nuevo por petición: nunca lo guardes en una variable global.
 *
 * Con Cache Components activo, leer cookies() es un dato de petición: el
 * componente que lo use debe ir dentro de un <Suspense>.
 */
export async function createClient() {
  const { url, key } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Llamado desde un Server Component, donde no se pueden escribir
          // cookies. Lo resuelve el proxy que refresca la sesión (Fase 1).
        }
      },
    },
  });
}
