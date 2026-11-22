import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { REMEMBER_COOKIE, isGuestOnlyPath, isPublicPath } from "@/lib/auth/paths";
import type { Database } from "./database.types";
import { withRememberPreference } from "./cookies";
import { getSupabaseEnv } from "./env";

/**
 * Refresca la sesión de Supabase en cada petición y aplica la protección de rutas:
 * - Sin sesión en una ruta privada → /login?next=<ruta>
 * - Con sesión en /login, /registro o /recuperar → /
 *
 * Es una comprobación optimista: cada consulta a la base sigue protegida por RLS.
 */
export async function updateSession(request: NextRequest) {
  const { url, key } = getSupabaseEnv();
  const remember = request.cookies.get(REMEMBER_COOKIE)?.value !== "0";
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, withRememberPreference(options, remember)),
        );
        Object.entries(headers).forEach(([header, value]) => response.headers.set(header, value));
      },
    },
  });

  // No pongas código entre createServerClient y getClaims: puede cerrar sesiones al azar.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  const redirectTo = (path: string) => {
    const target = request.nextUrl.clone();
    const [p, q] = path.split("?");
    target.pathname = p;
    target.search = q ? `?${q}` : "";
    const redirect = NextResponse.redirect(target);
    // Conserva las cookies de sesión recién refrescadas.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (!signedIn && !isPublicPath(pathname)) {
    return redirectTo(`/login?next=${encodeURIComponent(pathname + search)}`);
  }
  if (signedIn && isGuestOnlyPath(pathname)) {
    return redirectTo("/");
  }
  return response;
}
