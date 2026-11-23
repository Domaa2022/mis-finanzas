// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDb, createUser, one, type Db } from "./harness";

const ANA = "11111111-1111-1111-1111-111111111111";
const BETO = "22222222-2222-2222-2222-222222222222";
let db: Db;

beforeAll(async () => {
  db = await createTestDb();
  await createUser(db, ANA);
  await createUser(db, BETO);
}, 60_000);

const cat = (user: string, name: string) =>
  one<{ id: string }>(db, "select id from categories where user_id = $1 and name = $2", [user, name]).then((r) => r.id);

describe("budgets", () => {
  it("crea un presupuesto por categoría y mes", async () => {
    const comida = await cat(ANA, "Comida");
    await asUser(db, ANA, (tx) => tx.query("insert into budgets (category_id, month, limit_cents) values ($1, '2026-11-01', 800000)", [comida]));
    await expect(
      asUser(db, ANA, (tx) => tx.query("insert into budgets (category_id, month, limit_cents) values ($1, '2026-11-01', 1)", [comida])),
    ).rejects.toThrow(/duplicate key/);
  });

  it("el mes debe ser el primer día", async () => {
    const comida = await cat(ANA, "Transporte");
    await expect(
      asUser(db, ANA, (tx) => tx.query("insert into budgets (category_id, month, limit_cents) values ($1, '2026-11-15', 100)", [comida])),
    ).rejects.toThrow(/check/);
  });

  it("solo acepta categorías de gasto", async () => {
    const salario = await cat(ANA, "Salario");
    await expect(
      asUser(db, ANA, (tx) => tx.query("insert into budgets (category_id, month, limit_cents) values ($1, '2026-11-01', 100)", [salario])),
    ).rejects.toThrow("Los presupuestos son solo para categorías de gasto.");
  });

  it("Beto no ve ni usa las categorías de Ana", async () => {
    const comida = await cat(ANA, "Salud");
    await expect(
      asUser(db, BETO, (tx) => tx.query("insert into budgets (category_id, month, limit_cents) values ($1, '2026-11-01', 100)", [comida])),
    ).rejects.toThrow(/foreign key/);
    const r = await asUser(db, BETO, (tx) => one<{ c: number }>(tx, "select count(*)::int c from budgets"));
    expect(r.c).toBe(0);
  });
});
