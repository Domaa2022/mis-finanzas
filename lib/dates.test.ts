import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  dayOfMonth,
  daysInMonth,
  daysLeftInMonth,
  endOfMonth,
  isISODate,
  isoWeekday,
  monthLabel,
  parseMonthParam,
  quedanDiasLabel,
  relativeDayLabel,
  shortDate,
  todayIn,
} from "./dates";

describe("todayIn", () => {
  it("usa la zona horaria del usuario", () => {
    // 2026-12-01 03:00 UTC es todavía 30 de noviembre en Tegucigalpa (UTC−6).
    const now = new Date("2026-12-01T03:00:00Z");
    expect(todayIn("America/Tegucigalpa", now)).toBe("2026-11-30");
    expect(todayIn("UTC", now)).toBe("2026-12-01");
  });
});

describe("meses", () => {
  it("conoce los años bisiestos", () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2100, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
  });

  it("último día del mes (regla 7)", () => {
    expect(endOfMonth("2026-02-10")).toBe("2026-02-28");
    expect(endOfMonth("2028-02-10")).toBe("2028-02-29");
    expect(endOfMonth("2026-04-01")).toBe("2026-04-30");
    expect(dayOfMonth(2026, 2, -1)).toBe("2026-02-28");
    expect(dayOfMonth(2026, 4, -1)).toBe("2026-04-30");
    expect(dayOfMonth(2026, 4, 31)).toBe("2026-04-30");
    expect(dayOfMonth(2026, 2, 30)).toBe("2026-02-28");
    expect(dayOfMonth(2026, 3, 15)).toBe("2026-03-15");
  });

  it("suma meses ajustando el fin de mes", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-11-15", 2)).toBe("2027-01-15");
    expect(addMonths("2026-03-15", -3)).toBe("2025-12-15");
  });

  it("suma días cruzando meses y años", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("día de la semana ISO", () => {
    expect(isoWeekday("2026-11-30")).toBe(1); // lunes
    expect(isoWeekday("2026-11-29")).toBe(7); // domingo
  });
});

describe("Quedan N días (regla 10)", () => {
  it("cuenta hoy hasta el último día del mes", () => {
    expect(daysLeftInMonth("2026-11-23")).toBe(8);
    expect(daysLeftInMonth("2026-11-30")).toBe(1);
    expect(daysLeftInMonth("2026-02-01")).toBe(28);
    expect(daysLeftInMonth("2028-02-01")).toBe(29);
  });

  it("usa singular para el último día", () => {
    expect(quedanDiasLabel("2026-11-30")).toBe("Queda 1 día");
    expect(quedanDiasLabel("2026-11-23")).toBe("Quedan 8 días");
  });
});

describe("textos en español", () => {
  it("formatea meses y fechas cortas", () => {
    expect(monthLabel("2026-11-01")).toBe("Noviembre 2026");
    expect(shortDate("2026-11-30")).toBe("lun 30 nov");
  });

  it("dice Hoy y Ayer", () => {
    expect(relativeDayLabel("2026-11-22", "2026-11-22")).toBe("Hoy");
    expect(relativeDayLabel("2026-11-21", "2026-11-22")).toBe("Ayer");
    expect(relativeDayLabel("2026-11-02", "2026-11-22")).toBe("Lunes 2 de noviembre");
  });
});

describe("validación", () => {
  it("valida fechas ISO reales", () => {
    expect(isISODate("2026-02-29")).toBe(false);
    expect(isISODate("2028-02-29")).toBe(true);
    expect(isISODate("2026-13-01")).toBe(false);
  });

  it("lee el parámetro de mes", () => {
    expect(parseMonthParam("2026-11")).toBe("2026-11-01");
    expect(parseMonthParam("2026-13")).toBeNull();
    expect(parseMonthParam("hola")).toBeNull();
  });
});
