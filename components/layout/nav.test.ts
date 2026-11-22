import { describe, expect, it } from "vitest";
import { isActive } from "./nav";

describe("isActive", () => {
  it("Inicio solo está activo en la raíz", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/cuentas", "/")).toBe(false);
  });

  it("marca la sección en sus subrutas", () => {
    expect(isActive("/cuentas", "/cuentas")).toBe(true);
    expect(isActive("/cuentas/nueva", "/cuentas")).toBe(true);
  });

  it("no confunde rutas con el mismo prefijo", () => {
    expect(isActive("/cuentas-viejas", "/cuentas")).toBe(false);
  });
});
