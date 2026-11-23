import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = [
  "/login",
  "/registro",
  "/recuperar",
  "/dev/ui",
  "/dev/formularios/nueva-cuenta",
  "/dev/formularios/registrar",
  "/dev/formularios/transferir",
  "/dev/formularios/programar-ahorro",
  "/dev/formularios/nueva-meta",
  "/dev/formularios/aportar",
  "/dev/formularios/nuevo-gasto-fijo",
];

for (const path of PAGES) {
  test(`${path} no tiene problemas de accesibilidad (WCAG AA)`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const summary = results.violations.map((v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`);
    expect(summary).toEqual([]);
  });
}
