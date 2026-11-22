import { expect, test } from "@playwright/test";

test.describe("Autenticación (sin sesión)", () => {
  for (const path of ["/", "/cuentas", "/perfil"]) {
    test(`${path} redirige a /login`, async ({ page }) => {
      await page.goto(path);
      await expect.poll(() => new URL(page.url()).pathname).toBe("/login");
      expect(new URL(page.url()).searchParams.get("next")).toBe(path);
      await expect(page.getByRole("heading", { level: 1, name: "Inicia sesión" })).toBeVisible();
    });
  }

  test("el login valida los campos y muestra/oculta la contraseña", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
    await expect(page.getByText("Escribe tu correo")).toBeVisible();
    await expect(page.getByText("Escribe tu contraseña")).toBeVisible();

    const password = page.getByLabel("Contraseña", { exact: true });
    await password.fill("secreta123");
    await expect(password).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Mostrar contraseña" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Ocultar contraseña" }).click();
    await expect(password).toHaveAttribute("type", "password");
  });

  test("tiene Google, Facebook y enlaces a registro y recuperación", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Iniciar sesión con Google" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Iniciar sesión con Facebook" })).toBeVisible();

    await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Recupera tu contraseña" })).toBeVisible();
    await page.getByRole("link", { name: "Volver a iniciar sesión" }).click();
    await page.getByRole("link", { name: "Crea una gratis" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Crea tu cuenta" })).toBeVisible();
  });

  test("el registro exige una contraseña de 8 caracteres", async ({ page }) => {
    await page.goto("/registro");
    await page.getByLabel("Nombre").fill("Ana");
    await page.getByLabel("Correo electrónico").fill("ana@correo.com");
    await page.getByLabel("Contraseña", { exact: true }).fill("corta");
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByText("Usa al menos 8 caracteres")).toBeVisible();
  });

  test("un error de OAuth en la URL se muestra en ámbar", async ({ page }) => {
    await page.goto("/login?error=otp_expired");
    await expect(page.getByRole("alert").filter({ hasText: "No pudimos" })).toContainText("El enlace venció o ya se usó");
  });
});
