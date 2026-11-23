// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates";
import { nextRunDate } from "@/lib/savings/schedule";
import type { Frequency } from "@/lib/supabase/database.types";
import { asUser, createTestDb, createUser, n, one, type Db } from "./harness";

const ANA = "11111111-1111-1111-1111-111111111111";
const CORRIENTE = "aaaaaaaa-0000-0000-0000-000000000001";
const TARJETA = "aaaaaaaa-0000-0000-0000-000000000002";
const DOLARES = "aaaaaaaa-0000-0000-0000-000000000003";
const VIAJE = "bbbbbbbb-0000-0000-0000-000000000001";
const SALARIO_CAT = "cccccccc-0000-0000-0000-000000000001";

let db: Db;

beforeAll(async () => {
  db = await createTestDb();
  await createUser(db, ANA);
  await db.query("insert into categories (id, user_id, name, color, kind) values ($1, $2, 'Sueldo prueba', '#0F766E', 'income')", [
    SALARIO_CAT,
    ANA,
  ]);
}, 60_000);

/** Reinicia cuentas, metas y movimientos de Ana entre pruebas. */
beforeEach(async () => {
  await db.exec(`
    delete from savings_schedules; delete from transactions; delete from notifications;
    delete from savings_goals; delete from accounts;
  `);
  await db.query(
    `insert into accounts (id, user_id, name, type, currency, color, initial_balance_cents) values
      ($1, $4, 'Corriente', 'checking', 'HNL', '#1D4ED8', 100000),
      ($2, $4, 'Tarjeta', 'credit_card', 'HNL', '#6D28D9', 0),
      ($3, $4, 'Dólares', 'savings', 'USD', '#334155', 50000)`,
    [CORRIENTE, TARJETA, DOLARES, ANA],
  );
  await db.query(
    "insert into savings_goals (id, user_id, name, color, target_cents, currency) values ($1, $2, 'Viaje', '#0F766E', 150000, 'HNL')",
    [VIAJE, ANA],
  );
});

type Schedule = {
  mode?: "fixed" | "percent";
  amount?: number | null;
  percent?: number | null;
  frequency?: Frequency;
  days?: number[];
  ends?: "on_goal" | "on_date" | "never";
  endDate?: string | null;
  account?: string;
  nextRun: string;
  lastRun: string;
};

async function schedule(s: Schedule): Promise<string> {
  const mode = s.mode ?? "fixed";
  const row = await one<{ id: string }>(
    db,
    `insert into savings_schedules (user_id, goal_id, account_id, mode, amount_cents, percent, frequency, days, ends, end_date)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id`,
    [
      ANA,
      VIAJE,
      s.account ?? CORRIENTE,
      mode,
      mode === "fixed" ? (s.amount ?? 50000) : null,
      mode === "percent" ? (s.percent ?? 10) : null,
      s.frequency ?? "biweekly",
      s.days ?? [15, -1],
      s.ends ?? "on_goal",
      s.endDate ?? null,
    ],
  );
  // Estas pruebas cubren las reglas 4–7 sin esperar el ingreso (eso se prueba en ahorro-espera-ingreso).
  await db.query("update savings_schedules set next_run_on = $2, last_run_on = $3, wait_for_income = false where id = $1", [
    row.id,
    s.nextRun,
    s.lastRun,
  ]);
  return row.id;
}

const run = (id: string, today: string) =>
  one<{ c: number }>(db, "select process_savings_schedule($1, $2) as c", [id, today]).then((r) => r.c);
const saved = () => one<{ s: string }>(db, "select saved_cents s from goal_progress where goal_id = $1", [VIAJE]).then((r) => n(r.s));
const state = (id: string) =>
  one<{ active: boolean; next_run_on: string; last_run_on: string }>(
    db,
    "select active, next_run_on::text, last_run_on::text from savings_schedules where id = $1",
    [id],
  );
const contributions = () =>
  db
    .query<{ occurred_on: string; amount_cents: string }>(
      "select occurred_on::text, amount_cents from transactions where kind = 'goal_contribution' order by occurred_on",
    )
    .then((r) => r.rows.map((x) => [x.occurred_on, n(x.amount_cents)]));
const income = (amount: number, date: string, account = CORRIENTE) =>
  db.query(
    "insert into transactions (user_id, account_id, kind, amount_cents, occurred_on, category_id) values ($1, $2, 'income', $3, $4, $5)",
    [ANA, account, amount, date, SALARIO_CAT],
  );

describe("next_schedule_date (SQL) = nextRunDate (TS)", () => {
  it("coinciden en todos los días de 2026–2028 para varias reglas (regla 7)", async () => {
    const rules: [Frequency, number[]][] = [
      ["biweekly", [15, -1]],
      ["biweekly", [1, 15]],
      ["biweekly", [30, -1]],
      ["monthly", [-1]],
      ["monthly", [31]],
      ["monthly", [29]],
      ["monthly", [1]],
      ["weekly", [1]],
      ["weekly", [7]],
    ];
    const dates: string[] = [];
    for (let d = "2026-01-01"; d <= "2028-12-31"; d = addDays(d, 1)) dates.push(d);

    for (const [frequency, days] of rules) {
      const { rows } = await db.query<{ after: string; next: string }>(
        "select d::text as after, next_schedule_date($1, $2, d)::text as next from unnest($3::date[]) d",
        [frequency, days, dates],
      );
      for (const r of rows) {
        expect(r.next, `${frequency} ${days} después de ${r.after}`).toBe(nextRunDate(frequency, days, r.after));
      }
    }
  });
});

describe("al crear una programación", () => {
  it("el primer aporte queda después de hoy", async () => {
    const r = await asUser(db, ANA, (tx) =>
      one<{ ok: boolean }>(
        tx,
        `insert into savings_schedules (goal_id, account_id, mode, amount_cents, frequency, days)
         values ($1, $2, 'fixed', 100, 'monthly', '{-1}') returning next_run_on > user_today() as ok`,
        [VIAJE, CORRIENTE],
      ),
    );
    expect(r.ok).toBe(true);
  });
});

describe("process_savings_schedule", () => {
  it("aporta el monto fijo y avanza a la próxima fecha", async () => {
    const id = await schedule({ nextRun: "2026-11-30", lastRun: "2026-11-15", ends: "never" });
    expect(await run(id, "2026-11-30")).toBe(1);
    expect(await contributions()).toEqual([["2026-11-30", 50000]]);
    expect(await state(id)).toMatchObject({ next_run_on: "2026-12-15", last_run_on: "2026-11-30", active: true });
  });

  it("no hace nada antes de la fecha", async () => {
    const id = await schedule({ nextRun: "2026-11-30", lastRun: "2026-11-15" });
    expect(await run(id, "2026-11-29")).toBe(0);
  });

  it("procesa fechas atrasadas una por una", async () => {
    const id = await schedule({ nextRun: "2026-11-15", lastRun: "2026-10-31", ends: "never", amount: 10000 });
    expect(await run(id, "2026-12-16")).toBe(3);
    expect(await contributions()).toEqual([
      ["2026-11-15", 10000],
      ["2026-11-30", 10000],
      ["2026-12-15", 10000],
    ]);
  });

  it("regla 4: por porcentaje usa solo los ingresos desde el aporte anterior", async () => {
    await income(200000, "2026-11-10"); // antes del aporte anterior: no cuenta
    await income(300000, "2026-11-20");
    await income(100000, "2026-11-30");
    await income(999999, "2026-12-01"); // después de la fecha: no cuenta
    const id = await schedule({ mode: "percent", percent: 10, nextRun: "2026-11-30", lastRun: "2026-11-15", ends: "never" });
    await run(id, "2026-11-30");
    expect(await contributions()).toEqual([["2026-11-30", 40000]]);
  });

  it("regla 4: por porcentaje sin ingresos no crea el movimiento", async () => {
    const id = await schedule({ mode: "percent", percent: 10, nextRun: "2026-11-30", lastRun: "2026-11-15" });
    expect(await run(id, "2026-11-30")).toBe(0);
    expect(await contributions()).toEqual([]);
    expect(await state(id)).toMatchObject({ next_run_on: "2026-12-15", last_run_on: "2026-11-30", active: true });
  });

  it("regla 5: sin saldo suficiente omite el aporte y notifica", async () => {
    const id = await schedule({ nextRun: "2026-11-30", lastRun: "2026-11-15", amount: 100001 });
    expect(await run(id, "2026-11-30")).toBe(0);
    expect(await contributions()).toEqual([]);
    const note = await one<{ title: string; body: string }>(db, "select title, body from notifications where kind = 'savings_skipped'");
    expect(note.title).toBe("No se apartó tu ahorro para Viaje");
    expect(note.body).toContain("L 1,000.01");
    const bal = await one<{ b: string }>(db, "select balance_cents b from account_balances where account_id = $1", [CORRIENTE]);
    expect(n(bal.b)).toBe(100000);
    expect((await state(id)).next_run_on).toBe("2026-12-15");
  });

  it("regla 5: una tarjeta de crédito sí puede quedar en negativo", async () => {
    const id = await schedule({ nextRun: "2026-11-30", lastRun: "2026-11-15", account: TARJETA, ends: "never" });
    expect(await run(id, "2026-11-30")).toBe(1);
  });

  it("regla 6: se desactiva solo al llegar a la meta, con el último aporte justo", async () => {
    // Meta 1,500; aportes de 500 → 30 nov, 15 dic, 31 dic.
    const id = await schedule({ nextRun: "2026-11-30", lastRun: "2026-11-15", amount: 50000 });
    await db.query("update accounts set initial_balance_cents = 1000000 where id = $1", [CORRIENTE]);
    await run(id, "2026-12-15");
    expect((await state(id)).active).toBe(true);
    expect(await saved()).toBe(100000);

    await db.query("update savings_schedules set amount_cents = 70000 where id = $1", [id]);
    await run(id, "2027-01-31");
    expect(await saved()).toBe(150000);
    expect(await contributions()).toEqual([
      ["2026-11-30", 50000],
      ["2026-12-15", 50000],
      ["2026-12-31", 50000],
    ]);
    expect((await state(id)).active).toBe(false);
    const note = await one<{ title: string }>(db, "select title from notifications where kind = 'goal_completed'");
    expect(note.title).toBe("¡Completaste tu meta Viaje!");
  });

  it("con 'Nunca' sigue aportando aunque pase la meta", async () => {
    await db.query("update accounts set initial_balance_cents = 1000000 where id = $1", [CORRIENTE]);
    const id = await schedule({ nextRun: "2026-11-30", lastRun: "2026-11-15", amount: 100000, ends: "never" });
    await run(id, "2026-12-31");
    expect(await saved()).toBe(300000);
    expect((await state(id)).active).toBe(true);
  });

  it("con 'En una fecha' se desactiva al pasar la fecha final", async () => {
    await db.query("update accounts set initial_balance_cents = 1000000 where id = $1", [CORRIENTE]);
    const id = await schedule({ nextRun: "2026-11-30", lastRun: "2026-11-15", amount: 1000, ends: "on_date", endDate: "2026-12-20" });
    await run(id, "2027-01-31");
    expect(await contributions()).toEqual([
      ["2026-11-30", 1000],
      ["2026-12-15", 1000],
    ]);
    expect((await state(id)).active).toBe(false);
  });

  it("regla 7: el último día funciona en febrero y en años bisiestos", async () => {
    await db.query("update accounts set initial_balance_cents = 10000000 where id = $1", [CORRIENTE]);
    const id = await schedule({ frequency: "monthly", days: [-1], nextRun: "2027-01-31", lastRun: "2026-12-31", amount: 100, ends: "never" });
    await run(id, "2028-03-31");
    const dates = (await contributions()).map(([d]) => d);
    expect(dates).toContain("2027-02-28");
    expect(dates).toContain("2027-04-30");
    expect(dates).toContain("2028-02-29");
    expect(dates).toHaveLength(15);
  });

  it("no corre si está pausada", async () => {
    const id = await schedule({ nextRun: "2026-11-30", lastRun: "2026-11-15" });
    await db.query("update savings_schedules set active = false where id = $1", [id]);
    expect(await run(id, "2026-12-31")).toBe(0);
  });
});

describe("contribute_to_goal", () => {
  it("aporta desde una cuenta de la misma moneda", async () => {
    await asUser(db, ANA, (tx) => tx.query("select contribute_to_goal($1, $2, 25000, '2026-11-22')", [VIAJE, CORRIENTE]));
    expect(await saved()).toBe(25000);
  });

  it("rechaza otra moneda y saldo insuficiente", async () => {
    await expect(
      asUser(db, ANA, (tx) => tx.query("select contribute_to_goal($1, $2, 100, null)", [VIAJE, DOLARES])),
    ).rejects.toThrow("La cuenta debe estar en la misma moneda que la meta.");
    await expect(
      asUser(db, ANA, (tx) => tx.query("select contribute_to_goal($1, $2, 100001, null)", [VIAJE, CORRIENTE])),
    ).rejects.toThrow(/No hay saldo suficiente/);
  });

  it("el usuario no puede ejecutar el job directamente", async () => {
    await expect(asUser(db, ANA, (tx) => tx.query("select run_due_savings()"))).rejects.toThrow(/permission denied/);
  });
});
