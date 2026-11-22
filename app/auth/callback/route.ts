import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth/paths";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino de OAuth (Google, Facebook) y de los enlaces de correo
 * (confirmar cuenta, recuperar contraseña). Cambia el código por una sesión.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.code ?? "unknown")}`, origin));
  }

  const providerError = searchParams.get("error_code") ?? searchParams.get("error");
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(providerError ?? "unknown")}`, origin));
}
