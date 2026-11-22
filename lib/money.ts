/**
 * Utilidades de moneda. Los montos viajan siempre como enteros en centavos;
 * nunca se usan decimales de punto flotante para guardar ni sumar dinero.
 */

export type Currency = "HNL" | "USD";

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  HNL: "L",
  USD: "$",
};

export const CURRENCY_NAME: Record<Currency, string> = {
  HNL: "Lempiras",
  USD: "Dólares",
};

const NBSP = " ";

const numberFormat = new Intl.NumberFormat("es-HN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formatea centavos como texto: 123450 → "L 1,234.50".
 * El espacio entre símbolo y monto es de no separación para que no se parta.
 */
export function formatMoney(
  cents: number,
  currency: Currency,
  options: { signDisplay?: "auto" | "always" } = {},
): string {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`Monto en centavos inválido: ${cents}`);
  }
  const abs = numberFormat.format(Math.abs(cents) / 100);
  const symbol = CURRENCY_SYMBOL[currency];
  let sign = "";
  if (cents < 0) sign = "−";
  else if (options.signDisplay === "always" && cents > 0) sign = "+";
  return `${sign}${symbol}${NBSP}${abs}`;
}

/** Formatea centavos sin símbolo, para campos de texto: 123450 → "1,234.50". */
export function formatAmount(cents: number): string {
  return numberFormat.format(cents / 100);
}

/**
 * Convierte lo que escribe la persona en centavos.
 * Acepta separador de miles con coma y decimales con punto ("1,234.5").
 * Devuelve null si el texto está vacío o no es un monto válido
 * (letras, más de dos decimales, negativo cuando no se permite).
 */
export function parseMoneyInput(
  input: string,
  options: { allowNegative?: boolean } = {},
): number | null {
  const raw = input.trim().replace(/\s/g, "");
  if (raw === "") return null;

  const match = /^(-)?(\d{1,3}(?:,\d{3})+|\d+)?(?:\.(\d{0,2}))?$/.exec(raw);
  if (!match) return null;

  const [, minus, intPart = "", decPart] = match;
  if (intPart === "" && (decPart === undefined || decPart === "")) return null;
  if (minus && !options.allowNegative) return null;

  const whole = Number(intPart.replace(/,/g, "") || "0");
  const fraction = Number((decPart ?? "").padEnd(2, "0") || "0");
  const cents = whole * 100 + fraction;
  if (!Number.isSafeInteger(cents)) return null;

  return minus ? -cents : cents;
}
