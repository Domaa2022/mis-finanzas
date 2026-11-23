import { expect, test } from "@playwright/test";

/**
 * Flujo principal contra un proyecto de Supabase de prueba:
 * registro → crear cuenta → registrar gasto → transferir → programar ahorro.
 *
 * Requiere en .env.local un proyecto de prueba con la confirmación de correo
 * desactivada (Authentication → Providers → Email → Confirm email) y:
 *   E2E_SUPABASE=1
 * Crea un usuario nuevo en cada corrida.
 */
test.skip(!process.env.E2E_SUPABASE, "Define E2E_SUPABASE=1 con un proyecto de Supabase de prueba");
test.describe.configure({ mode: "serial" });

test("registro → cuenta → gasto → transferencia → ahorro programado", async ({ page, isMobile }) => {
  test.setTimeout(120_000);
  const email = `e2e-${Date.now()}-${isMobile ? "m" : "d"}@ejemplo.com`;

  // Registro
  await page.goto("/registro");
  await page.getByLabel("Nombre").fill("Prueba");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill("contrasena-segura-123");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Hola, Prueba" })).toBeVisible({ timeout: 15_000 });

  // Primera cuenta
  await page.goto("/cuentas/nueva");
  await page.getByRole("radio", { name: "Corriente" }).check({ force: true });
  await page.getByLabel("Nombre de la cuenta").fill("Corriente");
  await page.getByLabel("Banco").selectOption("BAC Credomatic");
  await page.getByLabel("Saldo actual").fill("10000");
  await page.getByRole("button", { name: "Guardar cuenta" }).click();
  await expect(page).toHaveURL(/\/cuentas$/);

  // Segunda cuenta
  await page.goto("/cuentas/nueva");
  await page.getByLabel("Nombre de la cuenta").fill("Ahorro");
  await page.getByLabel("Banco").selectOption("Banco Atlántida");
  await page.getByRole("button", { name: "Guardar cuenta" }).click();
  await expect(page).toHaveURL(/\/cuentas$/);
  await expect(page.getByText("L 10,000.00").first()).toBeVisible();

  // Registrar gasto
  await page.goto("/registrar");
  await page.getByLabel("Monto").fill("250");
  await page.getByRole("radio", { name: "Comida" }).check({ force: true });
  // La cuenta preseleccionada es la primera (Corriente).
  await page.getByRole("button", { name: "Guardar gasto" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("L 9,750.00").first()).toBeVisible();

  // Transferir
  await page.goto("/transferir");
  // Por defecto: desde Corriente hacia Ahorro.
  await page.getByLabel("Monto a transferir").fill("1000");
  await page.getByRole("button", { name: "Transferir", exact: true }).click();
  await expect(page).toHaveURL(/\/cuentas$/);
  await expect(page.getByText("L 8,750.00").first()).toBeVisible();
  await expect(page.getByText("L 1,000.00").first()).toBeVisible();

  // La transferencia no cuenta como gasto
  await page.goto("/movimientos");
  await expect(page.getByText("Transferencia a Ahorro").first()).toBeVisible();
  await expect(page.getByText("L 250.00").first()).toBeVisible();

  // Meta y ahorro programado
  await page.goto("/ahorros/nueva-meta");
  await page.getByLabel("Nombre de la meta").fill("Viaje");
  await page.getByLabel("¿Cuánto quieres juntar?").fill("5000");
  await page.getByRole("button", { name: "Crear meta" }).click();
  await expect(page).toHaveURL(/\/ahorros$/);

  await page.goto("/ahorros/programar");
  await page.getByLabel("Monto de cada aporte").fill("500");
  await page.getByRole("button", { name: "Programar ahorro" }).click();
  await expect(page).toHaveURL(/\/ahorros$/);
  await expect(page.getByText("cada quincena")).toBeVisible();
  await expect(page.getByRole("switch").first()).toHaveAttribute("aria-checked", "true");
});
