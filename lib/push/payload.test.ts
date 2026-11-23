import { describe, expect, it } from "vitest";
import { buildPushPayload, isGoneStatus } from "./payload";

describe("buildPushPayload", () => {
  it("usa el enlace interno de la notificación", () => {
    expect(buildPushPayload({ id: "1", kind: "charge_reminder", title: "T", body: "B", href: "/gastos-fijos" })).toEqual({
      title: "T",
      body: "B",
      url: "/gastos-fijos",
      tag: "charge_reminder:1",
    });
  });

  it("no acepta enlaces externos", () => {
    expect(buildPushPayload({ id: "1", kind: "x", title: "T", body: "B", href: "//malo.com" }).url).toBe("/notificaciones");
    expect(buildPushPayload({ id: "1", kind: "x", title: "T", body: "B", href: "https://malo.com" }).url).toBe("/notificaciones");
    expect(buildPushPayload({ id: "1", kind: "x", title: "T", body: "B", href: null }).url).toBe("/notificaciones");
  });

  it("borra suscripciones vencidas (404/410)", () => {
    expect(isGoneStatus(410)).toBe(true);
    expect(isGoneStatus(404)).toBe(true);
    expect(isGoneStatus(500)).toBe(false);
  });
});
