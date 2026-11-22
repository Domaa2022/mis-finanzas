import { z } from "zod";

const email = z.string().trim().min(1, "Escribe tu correo").pipe(z.email("Escribe un correo válido"));
const newPassword = z.string().min(8, "Usa al menos 8 caracteres").max(72, "Usa como máximo 72 caracteres");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Escribe tu contraseña"),
  remember: z.boolean(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Escribe tu nombre").max(60, "Usa como máximo 60 caracteres"),
  email,
  password: newPassword,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotSchema = z.object({ email });
export type ForgotInput = z.infer<typeof forgotSchema>;

export const resetSchema = z
  .object({ password: newPassword, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Las contraseñas no coinciden", path: ["confirm"] });
export type ResetInput = z.infer<typeof resetSchema>;

export const oauthProviderSchema = z.enum(["google", "facebook"]);
export type OAuthProvider = z.infer<typeof oauthProviderSchema>;

/** Resultado de las acciones de autenticación. */
export type AuthActionResult = { ok: false; error: string } | { ok: true; message?: string };
