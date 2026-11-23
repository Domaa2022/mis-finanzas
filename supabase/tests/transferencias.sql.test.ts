// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDb, createUser, n, one, type Db } from "./harness";

const ANA = "11111111-1111-1111-1111-111111111111";
const BETO = "22222222-2222-2222-2222-222222222222";
const CORRIENTE = "aaaaaaaa-0000-0000-0000-000000000001";
const AHORRO = "aaaaaaaa-0000-0000-0000-000000000002";
const DOLARES = "aaaaaaaa-0000-0000-0000-000000000003";
const TARJETA = "aaaaaaaa-0000-0000-0000-000000000004";

let db: Db;

const balance = async (id: string) =>
  n((await one<{ b: string }>(db, "select balance_cents b from account_balances where account_id = $1", [id])).b);

beforeAll(async () => {
  db = await createTestDb();
  await createUser(db, ANA);
  await createUser(db, BETO);
  await asUser(db, ANA, (tx) =>
    tx.query(
      `insert into accounts (id, name, type, currency, color, initial_balance_cents) values
        ($1, 'Corriente', 'checking', 'HNL', '#1D4ED8', 500000),
        ($2, 'Ahorro', 'savings', 'HNL', '#0F766E', 0),
        ($3, 'Dólares', 'savings', 'USD', '#334155', 0),
        ($4, 'Tarjeta', 'credit_card', 'HNL', '#6D28D9', 0)`,
      [CORRIENTE, AHORRO, DOLARES, TARJETA],
    ),
  );
}, 60_000);

const transfer = (from: string, to: string, amount: number, rate: number | null = null, user = ANA) =>
  asUser(db, user, (tx) =>
    one<{ id: string }>(tx, "select create_transfer($1, $2, $3, $4, '2026-11-20', 'Prueba') as id", [from, to, amount, rate]),
  );

describe("create_transfer", () => {
  it("crea dos movimientos y mueve el saldo sin cambiar el total", async () => {
    const { id } = await transfer(CORRIENTE, AHORRO, 100000);
    expect(await balance(CORRIENTE)).toBe(400000);
    expect(await balance(AHORRO)).toBe(100000);
    const kinds = await db.query<{ kind: string }>("select kind from transactions where transfer_id = $1 order by kind", [id]);
    expect(kinds.rows.map((r) => r.kind).sort()).toEqual(["transfer_in", "transfer_out"]);
  });

  it("no cuenta como gasto ni ingreso (regla 1)", async () => {
    const r = await one<{ c: number }>(db, "select count(*)::int c from transactions where kind in ('expense', 'income')");
    expect(r.c).toBe(0);
  });

  it("entre monedas distintas guarda la tasa y los dos montos (regla 2)", async () => {
    const { id } = await transfer(CORRIENTE, DOLARES, 246500, 24.65);
    const t = await one<{ amount_cents: string; to_amount_cents: string; exchange_rate: string }>(
      db,
      "select amount_cents, to_amount_cents, exchange_rate from transfers where id = $1",
      [id],
    );
    expect(n(t.amount_cents)).toBe(246500);
    expect(n(t.to_amount_cents)).toBe(10000);
    expect(n(t.exchange_rate)).toBe(24.65);
    expect(await balance(DOLARES)).toBe(10000);
  });

  it("exige la tasa cuando las monedas difieren", async () => {
    await expect(transfer(CORRIENTE, DOLARES, 1000)).rejects.toThrow("Escribe la tasa de cambio.");
  });

  it("no deja la cuenta de origen en negativo", async () => {
    await expect(transfer(AHORRO, CORRIENTE, 999999999)).rejects.toThrow(/No hay saldo suficiente/);
  });

  it("una tarjeta de crédito sí puede quedar en negativo", async () => {
    await transfer(TARJETA, AHORRO, 5000);
    expect(await balance(TARJETA)).toBe(-5000);
  });

  it("rechaza la misma cuenta y montos no positivos", async () => {
    await expect(transfer(CORRIENTE, CORRIENTE, 100)).rejects.toThrow("Elige dos cuentas distintas.");
    await expect(transfer(CORRIENTE, AHORRO, 0)).rejects.toThrow("El monto debe ser mayor que cero.");
  });

  it("Beto no puede transferir desde las cuentas de Ana", async () => {
    await expect(transfer(CORRIENTE, AHORRO, 100, null, BETO)).rejects.toThrow("No encontramos una de las cuentas.");
  });

  it("no se puede editar una parte de la transferencia directamente", async () => {
    await asUser(db, ANA, (tx) => tx.query("update transactions set amount_cents = 1 where kind = 'transfer_in'"));
    const r = await one<{ c: number }>(db, "select count(*)::int c from transactions where kind = 'transfer_in' and amount_cents = 1");
    expect(r.c).toBe(0);
  });

  it("borrar la transferencia borra sus dos movimientos", async () => {
    const { id } = await transfer(CORRIENTE, AHORRO, 1000);
    const before = await balance(CORRIENTE);
    await asUser(db, ANA, (tx) => tx.query("delete from transfers where id = $1", [id]));
    const r = await one<{ c: number }>(db, "select count(*)::int c from transactions where transfer_id = $1", [id]);
    expect(r.c).toBe(0);
    expect(await balance(CORRIENTE)).toBe(before + 1000);
  });
});
