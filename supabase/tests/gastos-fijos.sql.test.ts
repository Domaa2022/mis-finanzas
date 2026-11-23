// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates";
import { nextChargeDate } from "@/lib/recurring";
import type { RecurringFrequency } from "@/lib/supabase/database.types";
import { asUser, createTestDb, createUser, n, one, type Db } from "./harness";

const ANA = "11111111-1111-1111-1111-111111111111";
const BETO = "22222222-2222-2222-2222-222222222222";
const CTA = "aaaaaaaa-0000-0000-0000-000000000001";

let db: Db;

beforeAll(async () => {
  db = await createTestDb();
  await createUser(db, ANA);
  await createUser(db, BETO);
}, 60_000);

beforeEach(async () => {
  await db.exec("delete from pending_charges; delete from transactions; delete from notifications; delete from recurring_charges; delete from accounts;");
  await db.query(
    "insert into accounts (id, user_id, name, type, currency, color, initial_balance_cents) values ($1, $2, 'Corriente', 'checking', 'HNL', '#1D4ED8', 0)",
    [CTA, ANA],
  );
});

async function charge(opts: { auto: boolean; variable?: boolean; next: string; rule?: number; remind?: number | null }) {
  const cat = await one<{ id: string }>(db, "select id from categories where user_id = $1 and name = 'Servicios'", [ANA]);
  const r = await one<{ id: string }>(
    db,
    `insert into recurring_charges (user_id, kind, name, color, account_id, category_id, amount_cents, is_variable, frequency, day_rule, auto_register, remind_days_before, next_charge_on)
     values ($1, 'fixed', 'Energía', '#A16207', $2, $3, 80000, $4, 'monthly', $5, $6, $7, '2000-01-01') returning id`,
    [ANA, CTA, cat.id, opts.variable ?? false, opts.rule ?? 15, opts.auto, opts.remind ?? null],
  );
  await db.query("update recurring_charges set next_charge_on = $2 where id = $1", [r.id, opts.next]);
  return r.id;
}

const process = (id: string, today: string) =>
  one<{ c: number }>(db, "select process_recurring_charge($1, $2) c", [id, today]).then((r) => r.c);
const expenses = () =>
  db
    .query<{ occurred_on: string; amount_cents: string; note: string }>(
      "select occurred_on::text, amount_cents, note from transactions where kind = 'expense' order by occurred_on",
    )
    .then((r) => r.rows.map((x) => ({ date: x.occurred_on, amount: n(x.amount_cents), note: x.note })));

describe("next_charge_date (SQL) = nextChargeDate (TS)", () => {
  it("coinciden en todos los días de 2026–2028", async () => {
    const rules: [RecurringFrequency, number][] = [
      ["monthly", 25],
      ["monthly", -1],
      ["monthly", 31],
      ["monthly", 1],
      ["yearly", 214],
      ["yearly", 229],
      ["yearly", 1231],
      ["weekly", 3],
    ];
    const dates: string[] = [];
    for (let d = "2026-01-01"; d <= "2028-12-31"; d = addDays(d, 1)) dates.push(d);
    for (const [frequency, rule] of rules) {
      const { rows } = await db.query<{ after: string; next: string }>(
        "select d::text as after, next_charge_date($1, $2, d)::text as next from unnest($3::date[]) d",
        [frequency, rule, dates],
      );
      for (const r of rows) expect(r.next, `${frequency} ${rule} después de ${r.after}`).toBe(nextChargeDate(frequency, rule, r.after));
    }
  });
});

describe("regla 8", () => {
  it("con registro automático crea el gasto el día del cobro", async () => {
    const id = await charge({ auto: true, next: "2026-11-15" });
    expect(await process(id, "2026-11-14")).toBe(0);
    expect(await process(id, "2026-11-15")).toBe(1);
    expect(await expenses()).toEqual([{ date: "2026-11-15", amount: 80000, note: "Energía" }]);
    const r = await one<{ d: string }>(db, "select next_charge_on::text d from recurring_charges where id = $1", [id]);
    expect(r.d).toBe("2026-12-15");
  });

  it("sin registro automático queda pendiente de confirmar y avisa", async () => {
    const id = await charge({ auto: false, next: "2026-11-15" });
    await process(id, "2026-11-15");
    expect(await expenses()).toEqual([]);
    const p = await one<{ status: string; amount_cents: string }>(db, "select status, amount_cents from pending_charges where recurring_id = $1", [id]);
    expect(p.status).toBe("pending");
    expect(n(p.amount_cents)).toBe(80000);
    const note = await one<{ title: string }>(db, "select title from notifications where kind = 'charge_pending'");
    expect(note.title).toBe("Confirma el cobro de Energía");
  });

  it("con monto variable se confirma con el monto real", async () => {
    const id = await charge({ auto: false, variable: true, next: "2026-11-15" });
    await process(id, "2026-11-15");
    const pending = await one<{ id: string }>(db, "select id from pending_charges where recurring_id = $1", [id]);
    await asUser(db, ANA, (tx) => tx.query("select confirm_pending_charge($1, 91250, null)", [pending.id]));
    expect(await expenses()).toEqual([{ date: "2026-11-15", amount: 91250, note: "Energía" }]);
    const p = await one<{ status: string }>(db, "select status from pending_charges where id = $1", [pending.id]);
    expect(p.status).toBe("confirmed");
  });

  it("con monto fijo no deja cambiar el monto al confirmar", async () => {
    const id = await charge({ auto: false, next: "2026-11-15" });
    await process(id, "2026-11-15");
    const pending = await one<{ id: string }>(db, "select id from pending_charges where recurring_id = $1", [id]);
    await expect(asUser(db, ANA, (tx) => tx.query("select confirm_pending_charge($1, 1, null)", [pending.id]))).rejects.toThrow(
      "Este cobro tiene monto fijo.",
    );
  });

  it("un pendiente se puede descartar y ya no se confirma", async () => {
    const id = await charge({ auto: false, next: "2026-11-15" });
    await process(id, "2026-11-15");
    const pending = await one<{ id: string }>(db, "select id from pending_charges where recurring_id = $1", [id]);
    await asUser(db, ANA, (tx) => tx.query("update pending_charges set status = 'dismissed' where id = $1", [pending.id]));
    await expect(asUser(db, ANA, (tx) => tx.query("select confirm_pending_charge($1, null, null)", [pending.id]))).rejects.toThrow(
      "Ese cobro ya no está pendiente.",
    );
    expect(await expenses()).toEqual([]);
  });

  it("Beto no puede confirmar los pendientes de Ana", async () => {
    const id = await charge({ auto: false, next: "2026-11-15" });
    await process(id, "2026-11-15");
    const pending = await one<{ id: string }>(db, "select id from pending_charges where recurring_id = $1", [id]);
    await expect(asUser(db, BETO, (tx) => tx.query("select confirm_pending_charge($1, null, null)", [pending.id]))).rejects.toThrow(
      "Ese cobro ya no está pendiente.",
    );
  });

  it("recupera cobros atrasados sin duplicar", async () => {
    const id = await charge({ auto: true, next: "2026-09-15" });
    expect(await process(id, "2026-11-20")).toBe(3);
    expect(await process(id, "2026-11-20")).toBe(0);
    expect((await expenses()).map((e) => e.date)).toEqual(["2026-09-15", "2026-10-15", "2026-11-15"]);
  });

  it("avisa N días antes del cobro, una sola vez", async () => {
    const id = await charge({ auto: true, next: "2026-11-15", remind: 3 });
    await db.query("select remind_recurring($1, '2026-11-12')", [id]);
    await db.query("select remind_recurring($1, '2026-11-12')", [id]);
    await db.query("select remind_recurring($1, '2026-11-13')", [id]);
    const { rows } = await db.query<{ title: string; body: string }>("select title, body from notifications where kind = 'charge_reminder'");
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("En 3 días se cobra Energía");
    expect(rows[0].body).toBe("L 800.00 de Corriente.");
  });
});
