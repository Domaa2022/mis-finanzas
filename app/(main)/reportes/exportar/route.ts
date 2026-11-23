import { NextResponse, type NextRequest } from "next/server";
import { getTransactions } from "@/lib/data/transactions";
import { resolveMonth } from "@/lib/data/reports";
import { endOfMonth, monthParam } from "@/lib/dates";
import { toCsv } from "@/lib/reports";

/**
 * Exporta a CSV los gastos e ingresos del mes (`?mes=YYYY-MM`).
 * Igual que los reportes, no incluye transferencias entre cuentas (regla 1).
 */
export async function GET(request: NextRequest) {
  const { month } = await resolveMonth(request.nextUrl.searchParams.get("mes") ?? undefined);
  const items = await getTransactions({ from: month, to: endOfMonth(month), kinds: ["expense", "income"] });
  const csv = toCsv(
    items
      .slice()
      .reverse()
      .map((t) => ({
        date: t.occurred_on,
        kind: t.kind as "expense" | "income",
        category: t.category?.name ?? "Sin categoría",
        account: t.account.name,
        currency: t.account.currency,
        amount_cents: t.amount_cents,
        note: t.note ?? "",
      })),
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mis-finanzas-${monthParam(month)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
