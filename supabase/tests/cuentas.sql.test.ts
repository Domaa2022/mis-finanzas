// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDb, createUser, n, one, type Db } from "./harness";

const ANA = "11111111-1111-1111-1111-111111111111";
const BETO = "22222222-2222-2222-2222-222222222222";
const CTA = "aaaaaaaa-0000-0000-0000-000000000001";

let db: Db;

beforeAll(async () => {
  db = await createTestDb();
  await createUser(db, ANA, { full_name: "Ana López" });
  await createUser(db, BETO);
  await asUser(db, ANA, (tx) =>
    tx.query(
      "insert into accounts (id, name, type, currency, color, initial_balance_cents) values ($1, 'Corriente', 'checking', 'HNL', '#1D4ED8', 100000)",
      [CTA],
    ),
  );
}, 60_000);

const categoryId = (tx: Parameters<Parameters<typeof asUser>[2]>[0], name: string) =>
  one<{ id: string }>(tx, "select id from categories where name = $1", [name]).then((r) => r.id);

describe("al registrarse", () => {
  it("crea el perfil con el nombre y la zona horaria por defecto", async () => {
    const p = await one<{ display_name: string; timezone: string }>(db, "select * from profiles where id = $1", [ANA]);
    expect(p.display_name).toBe("Ana López");
    expect(p.timezone).toBe("America/Tegucigalpa");
  });

  it("crea las 12 categorías por defecto", async () => {
    const r = await one<{ c: number }>(db, "select count(*)::int c from categories where user_id = $1", [ANA]);
    expect(r.c).toBe(12);
  });
});

describe("vista account_balances", () => {
  it("sin movimientos el saldo es el inicial", async () => {
    const r = await asUser(db, ANA, (tx) => one<{ b: string }>(tx, "select balance_cents b from account_balances where account_id = $1", [CTA]));
    expect(n(r.b)).toBe(100000);
  });

  it("suma ingresos y resta gastos", async () => {
    const balance = await asUser(db, ANA, async (tx) => {
      await tx.query(
        "insert into transactions (account_id, kind, amount_cents, occurred_on, category_id) values ($1, 'income', 50000, '2026-11-01', $2), ($1, 'expense', 12550, '2026-11-02', $3)",
        [CTA, await categoryId(tx, "Salario"), await categoryId(tx, "Comida")],
      );
      const r = await one<{ b: string }>(tx, "select balance_cents b from account_balances where account_id = $1", [CTA]);
      return n(r.b);
    });
    expect(balance).toBe(100000 + 50000 - 12550);
  });

  it("no acepta montos en cero ni negativos", async () => {
    await expect(
      asUser(db, ANA, (tx) =>
        tx.query("insert into transactions (account_id, kind, amount_cents, occurred_on) values ($1, 'expense', 0, '2026-11-02')", [CTA]),
      ),
    ).rejects.toThrow(/check/);
  });

  it("no permite crear transferencias sueltas (solo create_transfer)", async () => {
    await expect(
      asUser(db, ANA, (tx) =>
        tx.query("insert into transactions (account_id, kind, amount_cents, occurred_on) values ($1, 'transfer_out', 100, '2026-11-02')", [CTA]),
      ),
    ).rejects.toThrow(/check|row-level security/);
  });

  it("no permite usar una categoría de otra persona", async () => {
    const betoCategory = await asUser(db, BETO, (tx) => categoryId(tx, "Comida"));
    await expect(
      asUser(db, ANA, (tx) =>
        tx.query(
          "insert into transactions (account_id, kind, amount_cents, occurred_on, category_id) values ($1, 'expense', 100, '2026-11-02', $2)",
          [CTA, betoCategory],
        ),
      ),
    ).rejects.toThrow(/foreign key/);
  });

  it("user_today usa la zona horaria del perfil", async () => {
    const r = await asUser(db, ANA, (tx) =>
      one<{ ok: boolean }>(tx, "select user_today() = (now() at time zone 'America/Tegucigalpa')::date as ok"),
    );
    expect(r.ok).toBe(true);
  });
});

describe("RLS: solo el dueño", () => {
  it("Beto no ve las cuentas, movimientos ni saldos de Ana", async () => {
    const r = await asUser(db, BETO, (tx) =>
      one<{ a: number; t: number; b: number }>(
        tx,
        "select (select count(*)::int from accounts) a, (select count(*)::int from transactions) t, (select count(*)::int from account_balances) b",
      ),
    );
    expect(r).toEqual({ a: 0, t: 0, b: 0 });
  });

  it("Beto no puede registrar en la cuenta de Ana", async () => {
    await expect(
      asUser(db, BETO, (tx) =>
        tx.query("insert into transactions (account_id, kind, amount_cents, occurred_on) values ($1, 'expense', 100, '2026-11-02')", [CTA]),
      ),
    ).rejects.toThrow(/foreign key/);
  });

  it("Beto no puede editar ni borrar la cuenta de Ana", async () => {
    await asUser(db, BETO, async (tx) => {
      await tx.query("update accounts set name = 'Hackeada' where id = $1", [CTA]);
      await tx.query("delete from accounts where id = $1", [CTA]);
    });
    const r = await one<{ name: string }>(db, "select name from accounts where id = $1", [CTA]);
    expect(r.name).toBe("Corriente");
  });

  it("Beto no puede crear una cuenta a nombre de Ana", async () => {
    await expect(
      asUser(db, BETO, (tx) =>
        tx.query("insert into accounts (user_id, name, type, color) values ($1, 'X', 'cash', '#334155')", [ANA]),
      ),
    ).rejects.toThrow(/row-level security/);
  });
});
