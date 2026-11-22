import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = { id: string; email: string; name: string };

/**
 * Usuario de la petición actual (verificado). Redirige a /login si no hay sesión.
 * Lee cookies: úsalo dentro de un <Suspense>.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");

  const meta = (claims.user_metadata ?? {}) as { full_name?: string; name?: string };
  const email = typeof claims.email === "string" ? claims.email : "";
  const name = (meta.full_name ?? meta.name ?? email.split("@")[0] ?? "").trim();
  return { id: claims.sub, email, name: firstName(name) || "de nuevo" };
});

function firstName(full: string): string {
  return full.split(/\s+/)[0] ?? "";
}
