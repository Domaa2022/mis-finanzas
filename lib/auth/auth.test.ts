import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./errors";
import { isGuestOnlyPath, isPublicPath, safeNext } from "./paths";
import { loginSchema, registerSchema, resetSchema } from "./schemas";

describe("rutas", () => {
  it("reconoce las rutas públicas", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/auth/callback")).toBe(true);
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/cuentas")).toBe(false);
    expect(isPublicPath("/loginx")).toBe(false);
  });

  it("solo saca de login/registro/recuperar a quien ya tiene sesión", () => {
    expect(isGuestOnlyPath("/registro")).toBe(true);
    expect(isGuestOnlyPath("/auth/callback")).toBe(false);
  });

  it("safeNext solo acepta rutas internas", () => {
    expect(safeNext("/cuentas?x=1")).toBe("/cuentas?x=1");
    expect(safeNext("//malo.com")).toBe("/");
    expect(safeNext("/\\malo.com")).toBe("/");
    expect(safeNext("https://malo.com")).toBe("/");
    expect(safeNext(null)).toBe("/");
    expect(safeNext("/login")).toBe("/");
  });
});

describe("esquemas", () => {
  it("valida el login", () => {
    expect(loginSchema.safeParse({ email: " ana@correo.com ", password: "x", remember: true }).success).toBe(true);
    const bad = loginSchema.safeParse({ email: "ana", password: "", remember: false });
    expect(bad.success).toBe(false);
  });

  it("exige contraseña de 8 caracteres al registrarse", () => {
    const r = registerSchema.safeParse({ name: "Ana", email: "ana@correo.com", password: "corta" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("Usa al menos 8 caracteres");
  });

  it("exige que las contraseñas coincidan", () => {
    const r = resetSchema.safeParse({ password: "12345678", confirm: "12345679" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(["confirm"]);
  });
});

describe("authErrorMessage", () => {
  it("traduce credenciales inválidas", () => {
    expect(authErrorMessage({ code: "invalid_credentials" })).toBe("El correo o la contraseña no coinciden.");
  });
  it("da un mensaje genérico para errores desconocidos", () => {
    expect(authErrorMessage({ code: "otro" })).toMatch(/Algo salió mal/);
    expect(authErrorMessage(null)).toMatch(/Algo salió mal/);
  });
});
