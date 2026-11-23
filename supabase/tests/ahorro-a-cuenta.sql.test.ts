// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { asUser, createTestDb, createUser, n, one, type Db } from "./harness";

const ANA = "11111111-1111-1111-1111-111111111111";
const CORRIENTE = "aaaaaaaa-0000-0000-0000-000000000001";
const AHORRO = "aaaaaaaa-0000-0000-0000-000000000002";
const DOLARES = "aaaaaaaa-0000-0000-0000-000000000003";
const VIAJE = "bbbbbbbb-0000-0000-0000-000000000001";

let db: Db;

beforeAll(async () => {
  db = await createTestDb();
  await createUser(db, ANA);
}, 60_000);

beforeEach(async () => {
  await db.exec("delete from savings_schedules; delete from transactions; delete from notifications; delete from savings_goals; delete from accounts;");
  await db.query(
    `insert into accounts (id, user_id, name, type, currency, color, initial_balance_cents) values
      ($1, $4, 'Corriente', 'checking', 'HNL', '#1D4ED8', 100000),
      ($2, $4, 'Ahorro', 'savings', 'HNL', '#0F766E', 0),
      ($3, $4, 'Dólares', 'savings', 'USD', '#334155', 0)`,
    [CORRIENTE, AHORRO, DOLARES, ANA],
  );
  await db.query(
    "insert into savings_goals (id, user_id, name, color, target_cents, currency) values ($1, $2, 'Viaje', '#0F766E', 150000, 'HNL')",
    [VIAJE, ANA],
  );
});

async function toAccount(opts: { to?: string; amount?: number; ends?: string; nextRun?: string } = {}): Promise<string> {
  const row = await one<{ id: string }>(
    db,
    `insert into savings_schedules (user_id, to_account_id, account_id, mode, amount_cents, frequency, days, ends)
     values ($1, $2, $3, 'fixed', $4, 'biweekly', '{15,-1}', $5) returning id`,
    [ANA, opts.to ?? AHORRO, CORRIENTE, opts.amount ?? 30000, opts.ends ?? "never"],
  );
  await db.query("update savings_schedules set next_run_on = $2, last_run_on = '2026-10-31' where id = $1", [
    row.id,
    opts.nextRun ?? "2026-11-15",
  ]);
  return row.id;
}

const process = (id: string, today: string) =>
  one<{ c: number }>(db, "select process_savings_schedule($1, $2) c", [id, today]).then((r) => r.c);
const balance = (account: string) =>
  one<{ b: string }>(db, "select balance_cents b from account_balances where account_id = $1", [account]).then((r) => n(r.b));

describe("ahorro programado hacia una cuenta", () => {
  it("cada aporte es una transferencia de la cuenta origen a la de ahorro", async () => {
    const id = await toAccount();
    expect(await process(id, "2026-11-30")).toBe(2);
    expect(await balance(CORRIENTE)).toBe(100000 - 60000);
    expect(await balance(AHORRO)).toBe(60000);
    const rows = await db.query<{ kind: string; occurred_on: string; note: string }>(
      "select kind, occurred_on::text, note from transactions order by occurred_on, kind::text",
    );
    expect(rows.rows).toEqual([
      { kind: "transfer_in", occurred_on: "2026-11-15", note: "Ahorro programado" },
      { kind: "transfer_out", occurred_on: "2026-11-15", note: "Ahorro programado" },
      { kind: "transfer_in", occurred_on: "2026-11-30", note: "Ahorro programado" },
      { kind: "transfer_out", occurred_on: "2026-11-30", note: "Ahorro programado" },
    ]);
    const s = await one<{ next: string; active: boolean }>(db, "select next_run_on::text next, active from savings_schedules where id = $1", [id]);
    expect(s).toEqual({ next: "2026-12-15", active: true });
  });

  it("sin saldo suficiente omite el aporte y avisa", async () => {
    const id = await toAccount({ amount: 200000 });
    expect(await process(id, "2026-11-15")).toBe(0);
    expect(await balance(AHORRO)).toBe(0);
    const note = await one<{ title: string }>(db, "select title from notifications where kind = 'savings_skipped'");
    expect(note.title).toBe("No se apartó tu ahorro para Ahorro");
  });

  it("se pausa si la cuenta de ahorro está archivada", async () => {
    const id = await toAccount();
    await db.query("update accounts set archived_at = now() where id = $1", [AHORRO]);
    expect(await process(id, "2026-11-15")).toBe(0);
    const s = await one<{ active: boolean }>(db, "select active from savings_schedules where id = $1", [id]);
    expect(s.active).toBe(false);
  });

  it("avisa un día antes con el nombre de la cuenta", async () => {
    await toAccount({ nextRun: "2026-11-15" });
    await db.query("select remind_savings(id, '2026-11-14') from savings_schedules");
    const note = await one<{ title: string; body: string }>(db, "select title, body from notifications where kind = 'savings_reminder'");
    expect(note.title).toBe("Mañana se aparta tu ahorro para Ahorro");
    expect(note.body).toContain("L 300.00");
  });

  it("exige la misma moneda, cuentas distintas y un solo destino", async () => {
    await expect(toAccount({ to: DOLARES })).rejects.toThrow(/misma moneda/);
    await expect(toAccount({ to: CORRIENTE })).rejects.toThrow(/distinct_accounts/);
    await expect(toAccount({ ends: "on_goal" })).rejects.toThrow(/ends_check/);
    await expect(
      db.query(
        `insert into savings_schedules (user_id, goal_id, to_account_id, account_id, mode, amount_cents, frequency, days, ends)
         values ($1, $2, $3, $4, 'fixed', 100, 'monthly', '{1}', 'never')`,
        [ANA, VIAJE, AHORRO, CORRIENTE],
      ),
    ).rejects.toThrow(/destination_check/);
  });

  it("las programaciones hacia una meta siguen igual", async () => {
    const id = await one<{ id: string }>(
      db,
      `insert into savings_schedules (user_id, goal_id, account_id, mode, amount_cents, frequency, days, ends)
       values ($1, $2, $3, 'fixed', 50000, 'biweekly', '{15,-1}', 'on_goal') returning id`,
      [ANA, VIAJE, CORRIENTE],
    );
    await db.query("update savings_schedules set next_run_on = '2026-11-15', last_run_on = '2026-10-31' where id = $1", [id.id]);
    expect(await process(id.id, "2026-11-15")).toBe(1);
    const saved = await one<{ s: string }>(db, "select saved_cents s from goal_progress where goal_id = $1", [VIAJE]);
    expect(n(saved.s)).toBe(50000);
  });

  it("la persona puede crear la programación con su sesión (RLS)", async () => {
    const r = await asUser(db, ANA, (tx) =>
      one<{ c: number }>(
        tx,
        `with s as (insert into savings_schedules (to_account_id, account_id, mode, amount_cents, frequency, days, ends)
          values ($1, $2, 'fixed', 100, 'monthly', '{1}', 'never') returning 1) select count(*)::int c from s`,
        [AHORRO, CORRIENTE],
      ),
    );
    expect(r.c).toBe(1);
  });
});
