import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** Ninguna pantalla debe ser más ancha que el teléfono (p. ej. tarjetas con textos largos). */
const PAGES = [
  "/login",
  "/registro",
  "/dev/ui",
  "/dev/ahorros",
  ...["nueva-cuenta", "registrar", "transferir", "programar-ahorro", "nueva-meta", "aportar", "nuevo-gasto-fijo"].map(
    (n) => `/dev/formularios/${n}`,
  ),
];

for (const path of PAGES) {
  test(`sin desborde horizontal: ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.locator("main").first().waitFor();
    await page.waitForLoadState("networkidle");
    const w = await page.evaluate(() => ({ viewport: window.innerWidth, scroll: document.documentElement.scrollWidth }));
    expect(w.scroll).toBeLessThanOrEqual(w.viewport);
  });
}

test("Ahorros con datos de ejemplo cumple WCAG AA", async ({ page }) => {
  await page.goto("/dev/ahorros");
  await page.getByText("Ahorros programados").waitFor();
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).exclude("nextjs-portal").analyze();
  expect(axe.violations.map((v) => v.id)).toEqual([]);
});
