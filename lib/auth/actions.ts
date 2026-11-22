"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authErrorMessage } from "./errors";
import { REMEMBER_COOKIE, safeNext } from "./paths";
import {
  forgotSchema,
  loginSchema,
  oauthProviderSchema,
  registerSchema,
  resetSchema,
  type AuthActionResult,
  type ForgotInput,
  type LoginInput,
  type OAuthProvider,
  type RegisterInput,
  type ResetInput,
} from "./schemas";

const INVALID = { ok: false, error: "Revisa los datos del formulario." } as const;

/** Origen público de la app para los enlaces de correo y OAuth. */
async function siteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function callbackUrl(origin: string, next: string) {
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

export async function signIn(input: LoginInput, next?: string): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return INVALID;
  const { email, password, remember } = parsed.data;

  const cookieStore = await cookies();
  cookieStore.set(REMEMBER_COOKIE, remember ? "1" : "0", {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    ...(remember ? { maxAge: 60 * 60 * 24 * 400 } : {}),
  });

  const supabase = await createClient({ remember });
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: authErrorMessage(error) };

  redirect(safeNext(next));
}

export async function signUp(input: RegisterInput): Promise<AuthActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return INVALID;
  const { name, email, password } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: callbackUrl(await siteOrigin(), "/"),
    },
  });
  if (error) return { ok: false, error: authErrorMessage(error) };

  // Con la confirmación de correo desactivada, Supabase devuelve la sesión de inmediato.
  if (data.session) redirect("/");

  return {
    ok: true,
    message: `Te enviamos un enlace a ${email}. Ábrelo para activar tu cuenta.`,
  };
}

export async function signInWithProvider(provider: OAuthProvider, next?: string): Promise<AuthActionResult> {
  const parsed = oauthProviderSchema.safeParse(provider);
  if (!parsed.success) return INVALID;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: parsed.data,
    options: { redirectTo: callbackUrl(await siteOrigin(), safeNext(next)) },
  });
  if (error || !data.url) return { ok: false, error: authErrorMessage(error) };

  redirect(data.url);
}

export async function requestPasswordReset(input: ForgotInput): Promise<AuthActionResult> {
  const parsed = forgotSchema.safeParse(input);
  if (!parsed.success) return INVALID;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: callbackUrl(await siteOrigin(), "/nueva-contrasena"),
  });
  // Por privacidad no revelamos si el correo existe; solo informamos límites de envío.
  if (error && (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit")) {
    return { ok: false, error: authErrorMessage(error) };
  }
  return {
    ok: true,
    message: `Si ${parsed.data.email} tiene una cuenta, te llegará un enlace para crear una contraseña nueva.`,
  };
}

export async function updatePassword(input: ResetInput): Promise<AuthActionResult> {
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) return INVALID;

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: authErrorMessage(error) };

  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(REMEMBER_COOKIE);
  redirect("/login");
}
