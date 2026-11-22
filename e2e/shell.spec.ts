import { expect, test } from "@playwright/test";

test.describe("AppShell y página de muestra", () => {
  test("muestra la navegación correcta según el ancho", async ({ page, isMobile }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: /Hola/ })).toBeVisible();

    const nav = page.getByRole("navigation", { name: "Navegación principal" });
    await expect(nav).toHaveCount(1);
    await expect(nav.getByRole("link", { name: "Inicio" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("link", { name: /Registrar gasto/ }).first()).toBeVisible();

    if (isMobile) {
      await expect(nav.getByRole("link", { name: "Reportes" })).toHaveCount(0);
    } else {
      await expect(nav.getByRole("link", { name: "Reportes" })).toBeVisible();
    }
  });

  test("permite elegir una cuenta", async ({ page }) => {
    await page.goto("/");
    const tile = page.getByRole("button", { name: /Efectivo/ });
    await tile.click();
    await expect(tile).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: /^Todas \d+ cuentas/ })).toHaveAttribute("aria-pressed", "false");
  });

  test("/dev/ui muestra todos los componentes", async ({ page }) => {
    await page.goto("/dev/ui");
    for (const name of [
      "Button",
      "Money",
      "Field · Input · Select",
      "SegmentedControl · Switch · MoneyInput",
      "ProgressBar",
      "Formulario (React Hook Form + Zod)",
      "AccountTile",
    ]) {
      await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    }
    await expect(page.getByRole("switch").first()).toBeVisible();
    await expect(page.getByRole("progressbar").first()).toBeVisible();
  });

  test("el formulario de ejemplo valida y acepta montos", async ({ page }) => {
    await page.goto("/dev/ui");
    const form = page.locator("form");
    await form.getByRole("button", { name: "Probar validación" }).click();
    await expect(form.getByText("Escribe un nombre")).toBeVisible();

    await form.getByLabel("Nombre").fill("Supermercado");
    await form.getByLabel("Monto").fill("1234.5");
    await form.getByRole("button", { name: "Probar validación" }).click();
    await expect(form.getByRole("status")).toContainText("1,234.50");
  });
});
