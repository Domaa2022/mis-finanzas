import { test } from "@playwright/test";

// Capturas para revisión visual. Solo corre con SCREENSHOTS=1.
test.skip(!process.env.SCREENSHOTS, "Solo con SCREENSHOTS=1");

for (const route of ["/", "/dev/ui"]) {
  test(`captura ${route}`, async ({ page }, info) => {
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    const name = route === "/" ? "inicio" : "dev-ui";
    await page.screenshot({ path: `test-results/capturas/${name}-${info.project.name}.png`, fullPage: true });
  });
}
