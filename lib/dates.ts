/**
 * Fechas de calendario como texto ISO "YYYY-MM-DD" (igual que el tipo `date` de Postgres).
 * Trabajar con texto evita los corrimientos de zona horaria de `Date`.
 */
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export const DEFAULT_TIMEZONE = "America/Tegucigalpa";

export type ISODate = string;

/** "Hoy" en la zona horaria indicada (regla 10). */
export function todayIn(timeZone: string = DEFAULT_TIMEZONE, now: Date = new Date()): ISODate {
  // en-CA formatea como YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function parts(date: ISODate): [number, number, number] {
  const [y, m, d] = date.split("-").map(Number);
  return [y, m, d];
}

function iso(y: number, m: number, d: number): ISODate {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Días del mes (1–12). */
export function daysInMonth(year: number, month: number): number {
  return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

/** Primer día del mes de la fecha. */
export function startOfMonth(date: ISODate): ISODate {
  const [y, m] = parts(date);
  return iso(y, m, 1);
}

/** Último día del mes de la fecha. */
export function endOfMonth(date: ISODate): ISODate {
  const [y, m] = parts(date);
  return iso(y, m, daysInMonth(y, m));
}

/** Suma meses conservando el día cuando se puede (31 ene + 1 mes = 28/29 feb). */
export function addMonths(date: ISODate, months: number): ISODate {
  const [y, m, d] = parts(date);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return iso(ny, nm, Math.min(d, daysInMonth(ny, nm)));
}

export function addDays(date: ISODate, days: number): ISODate {
  const [y, m, d] = parts(date);
  const t = Date.UTC(y, m - 1, d) + days * 86_400_000;
  const r = new Date(t);
  return iso(r.getUTCFullYear(), r.getUTCMonth() + 1, r.getUTCDate());
}

/** Diferencia en días (b − a). */
export function diffDays(a: ISODate, b: ISODate): number {
  const [ay, am, ad] = parts(a);
  const [by, bm, bd] = parts(b);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/** Día de la semana ISO: 1 = lunes … 7 = domingo. */
export function isoWeekday(date: ISODate): number {
  const [y, m, d] = parts(date);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return wd === 0 ? 7 : wd;
}

/**
 * Día concreto de un mes a partir de una regla: 1–31, o −1 para el último día.
 * Días que no existen en el mes (31 en abril) se ajustan al último día (regla 7).
 */
export function dayOfMonth(year: number, month: number, rule: number): ISODate {
  const last = daysInMonth(year, month);
  const day = rule === -1 ? last : Math.min(Math.max(rule, 1), last);
  return iso(year, month, day);
}

/**
 * Días que quedan del mes contando hoy (regla 10). El último día del mes devuelve 1.
 */
export function daysLeftInMonth(today: ISODate): number {
  return diffDays(today, endOfMonth(today)) + 1;
}

export function quedanDiasLabel(today: ISODate): string {
  const n = daysLeftInMonth(today);
  return n === 1 ? "Queda 1 día" : `Quedan ${n} días`;
}

const asDate = (d: ISODate) => parseISO(d);

/** "NOVIEMBRE 2026" (para el eyebrow en mayúsculas se aplica CSS). */
export function monthLabel(date: ISODate): string {
  const text = format(asDate(date), "MMMM yyyy", { locale: es });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "lun 30 nov" */
export function shortDate(date: ISODate): string {
  return format(asDate(date), "EEE d MMM", { locale: es }).replace(/\./g, "");
}

/** "30 nov" */
export function dayMonth(date: ISODate): string {
  return format(asDate(date), "d MMM", { locale: es }).replace(/\./g, "");
}

/** "Hoy", "Ayer" o "lunes 30 de noviembre". */
export function relativeDayLabel(date: ISODate, today: ISODate): string {
  const diff = diffDays(date, today);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  const text = format(asDate(date), "EEEE d 'de' MMMM", { locale: es });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Valida "YYYY-MM-DD" con fecha real. */
export function isISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = parts(value);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

/** Valida "YYYY-MM" y devuelve el primer día del mes. */
export function parseMonthParam(value: string | undefined | null): ISODate | null {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null;
  const [y, m] = value.split("-").map(Number);
  if (m < 1 || m > 12 || y < 2000 || y > 2100) return null;
  return iso(y, m, 1);
}

export function monthParam(date: ISODate): string {
  return date.slice(0, 7);
}
