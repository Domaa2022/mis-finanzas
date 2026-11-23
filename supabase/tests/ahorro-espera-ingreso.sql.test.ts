// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, createUser, n, one, type Db } from "./harness";

const ANA = "11111111-1111-1111-1111-111111111111";
const CORRIENTE = "aaaaaaaa-0000-0000-0000-000000000001";
const AHORRO = "aaaaaaaa-0000-0000-0000-000000000002";
const VIAJE = "bbbbbbbb-0000-0000-0000-000000000001";
const SUELDO = "cccccccc-0000-0000-0000-000000000001";

let db: Db;

beforeAll(async () => {
  db = await createTestDb();
  await createUser(db, ANA);
  await db.query("insert into categories (id, user_id, name, color, kind) values ($1, $2, 'Sueldo prueba', '#0F766E', 'income')", [
    SUELDO,
    ANA,
  ]);
}, 60_000);

beforeEach(async () => {
  await db.exec("delete from savings_schedules; delete from transactions; delete from notifications; delete from savings_goals; delete from accounts;");
  await db.query(
    `insert into accounts (id, user_id, name, type, currency, color, initial_balance_cents) values
      ($1, $3, 'Corriente', 'checking', 'HNL', '#1D4ED8', 100000),
      ($2, $3, 'Ahorro', 'savings', 'HNL', '#0F766E', 0)`,
    [CORRIENTE, AHORRO, ANA],
  );
  await db.query(
    "insert into savings_goals (id, user_id, name, color, target_cents, currency) values ($1, $2, 'Viaje', '#0F766E', 1000000, 'HNL')",
    [VIAJE, ANA],
  );
});

/** Quincenal (15 y último día), esperando el ingreso. Último aporte: 31 oct; próximo: 15 nov. */
async function schedule(opts: { mode?: "fixed" | "percent"; toAccount?: boolean } = {}): Promise<string> {
  const mode = opts.mode ?? "fixed";
  const r = await one<{ id: string }>(
    db,
    `insert into savings_schedules (user_id, goal_id, to_account_id, account_id, mode, amount_cents, percent, frequency, days, ends)
     values ($1, $2, $3, $4, $5, $6, $7, 'biweekly', '{15,-1}', 'never') returning id`,
    [ANA, opts.toAccount ? null : VIAJE, opts.toAccount ? AHORRO : null, CORRIENTE, mode, mode === "fixed" ? 30000 : null, mode === "percent" ? 10 : null],
  );
  await db.query("update savings_schedules set next_run_on = '2026-11-15', last_run_on = '2026-10-31' where id = $1", [r.id]);
  return r.id;
}

const income = (date: string, cents = 500000) =>
  db.query(
    "insert into transactions (user_id, account_id, kind, amount_cents, occurred_on, category_id) values ($1, $2, 'income', $3, $4, $5)",
    [ANA, CORRIENTE, cents, date, SUELDO],
  );
const process = (id: string, today: string) =>
  one<{ c: number }>(db, "select process_savings_schedule($1, $2) c", [id, today]).then((r) => r.c);
const state = (id: string) =>
  one<{ next: string; last: string }>(db, "select next_run_on::text next, last_run_on::text last from savings_schedules where id = $1", [id]);
const contributions = () =>
  db
    .query<{ d: string; a: string }>("select occurred_on::text d, amount_cents a from transactions where kind = 'goal_contribution' order by occurred_on")
    .then((r) => r.rows.map((x) => [x.d, n(x.a)]));
const notifications = (kind: string) =>
  db.query<{ title: string }>("select title from notifications where kind = $1", [kind]).then((r) => r.rows.map((x) => x.title));

describe("el ahorro programado espera el ingreso del periodo", () => {
  it("por defecto espera el ingreso", async () => {
    const id = await schedule();
    const r = await one<{ w: boolean }>(db, "select wait_for_income w from savings_schedules where id = $1", [id]);
    expect(r.w).toBe(true);
  });

  it("sin ingreso en la fecha, espera y avisa una sola vez", async () => {
    const id = await schedule();
    expect(await process(id, "2026-11-15")).toBe(0);
    expect(await process(id, "2026-11-16")).toBe(0);
    expect(await contributions()).toEqual([]);
    expect(await state(id)).toEqual({ next: "2026-11-15", last: "2026-10-31" });
    expect(await notifications("savings_waiting")).toEqual(["Tu ahorro para Viaje espera tu ingreso"]);
  });

  it("cuando entra el ingreso, aparta con la fecha del ingreso", async () => {
    const id = await schedule();
    await process(id, "2026-11-15");
    await income("2026-11-17");
    expect(await process(id, "2026-11-17")).toBe(1);
    expect(await contributions()).toEqual([["2026-11-17", 30000]]);
    expect(await state(id)).toEqual({ next: "2026-11-30", last: "2026-11-17" });
  });

  it("un ingreso antes de la fecha cuenta para ese periodo y aparta el día programado", async () => {
    const id = await schedule();
    await income("2026-11-14");
    expect(await process(id, "2026-11-15")).toBe(1);
    expect(await contributions()).toEqual([["2026-11-15", 30000]]);
  });

  it("cada ingreso sirve para un solo periodo", async () => {
    const id = await schedule();
    await income("2026-11-14");
    await process(id, "2026-11-15");
    // El 30 no hay ingreso nuevo: espera.
    expect(await process(id, "2026-11-30")).toBe(0);
    expect(await state(id)).toEqual({ next: "2026-11-30", last: "2026-11-15" });
  });

  it("si llega el siguiente aporte sin ingreso, ese periodo se omite y se avisa", async () => {
    const id = await schedule();
    await income("2026-11-30");
    // El periodo del 15 nunca recibió ingreso; el del 30 sí.
    expect(await process(id, "2026-11-30")).toBe(1);
    expect(await contributions()).toEqual([["2026-11-30", 30000]]);
    expect(await notifications("savings_skipped")).toEqual(["No se apartó tu ahorro para Viaje"]);
    expect(await state(id)).toEqual({ next: "2026-12-15", last: "2026-11-30" });
  });

  it("en porcentaje, aparta el porcentaje del ingreso cuando entra", async () => {
    const id = await schedule({ mode: "percent" });
    expect(await process(id, "2026-11-15")).toBe(0);
    await income("2026-11-16", 800000);
    expect(await process(id, "2026-11-16")).toBe(1);
    expect(await contributions()).toEqual([["2026-11-16", 80000]]);
  });

  it("también espera cuando el ahorro va a una cuenta", async () => {
    const id = await schedule({ toAccount: true });
    expect(await process(id, "2026-11-15")).toBe(0);
    await income("2026-11-18");
    expect(await process(id, "2026-11-18")).toBe(1);
    const t = await one<{ d: string }>(db, "select occurred_on::text d from transfers");
    expect(t.d).toBe("2026-11-18");
  });

  it("sin esperar, aparta en la fecha aunque no haya ingreso", async () => {
    const id = await schedule();
    await db.query("update savings_schedules set wait_for_income = false where id = $1", [id]);
    expect(await process(id, "2026-11-15")).toBe(1);
    expect(await contributions()).toEqual([["2026-11-15", 30000]]);
  });

  it("el recordatorio dice que se aparta cuando entre el ingreso", async () => {
    await schedule();
    await db.query("select remind_savings(id, '2026-11-14') from savings_schedules");
    const r = await one<{ body: string }>(db, "select body from notifications where kind = 'savings_reminder'");
    expect(r.body).toBe("Se apartarán L 300.00 cuando entre tu ingreso.");
  });
});
