import { test } from "@playwright/test";

// Capturas para revisión visual. Solo corre con SCREENSHOTS=1.
test.skip(!process.env.SCREENSHOTS, "Solo con SCREENSHOTS=1");

const FORMS = ["nueva-cuenta", "registrar", "transferir", "programar-ahorro", "nueva-meta", "aportar", "nuevo-gasto-fijo"];

for (const route of ["/login", "/registro", "/dev/ui", ...FORMS.map((f) => `/dev/formularios/${f}`)]) {
  test(`captura ${route}`, async ({ page }, info) => {
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    const name = route.slice(1).replaceAll("/", "-");
    await page.screenshot({ path: `test-results/capturas/${name}-${info.project.name}.png`, fullPage: true });
  });
}
