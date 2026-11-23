// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDb, createUser, n, one, type Db } from "./harness";

const ANA = "11111111-1111-1111-1111-111111111111";
const BETO = "22222222-2222-2222-2222-222222222222";
const VISA = "aaaaaaaa-0000-0000-0000-000000000001";
const VISA_USD = "aaaaaaaa-0000-0000-0000-000000000002";
const CORRIENTE = "aaaaaaaa-0000-0000-0000-000000000003";

let db: Db;

const insertCard = (id: string, currency: string, pairedWith: string | null, type = "credit_card") =>
  `insert into accounts (id, name, type, currency, color, initial_balance_cents, paired_account_id)
   values ('${id}', 'Visa', '${type}', '${currency}', '#6D28D9', -10000, ${pairedWith ? `'${pairedWith}'` : "null"})`;

beforeAll(async () => {
  db = await createTestDb();
  await createUser(db, ANA);
  await createUser(db, BETO);
  await asUser(db, ANA, async (tx) => {
    await tx.query(insertCard(CORRIENTE, "HNL", null, "checking"));
  });
}, 60_000);

describe("tarjeta con deuda en lempiras y dólares", () => {
  it("se crean las dos cuentas en una sola instrucción y cada una lleva su saldo", async () => {
    await asUser(db, ANA, (tx) =>
      tx.query(
        `insert into accounts (id, name, type, currency, color, initial_balance_cents, paired_account_id) values
           ($1, 'Visa', 'credit_card', 'HNL', '#6D28D9', -318975, null),
           ($2, 'Visa', 'credit_card', 'USD', '#6D28D9', -4500, $1)`,
        [VISA, VISA_USD],
      ),
    );
    const rows = await asUser(db, ANA, (tx) =>
      tx.query<{ currency: string; b: string }>(
        "select currency, balance_cents b from account_balances where account_id in ($1, $2) order by currency",
        [VISA, VISA_USD],
      ),
    );
    expect(rows.rows.map((r) => [r.currency, n(r.b)])).toEqual([
      ["HNL", -318975],
      ["USD", -4500],
    ]);
  });

  it("no acepta las dos cuentas en la misma moneda", async () => {
    await expect(
      asUser(db, ANA, async (tx) => {
        await tx.query(insertCard("aaaaaaaa-0000-0000-0000-000000000010", "HNL", null));
        await tx.query(insertCard("aaaaaaaa-0000-0000-0000-000000000011", "HNL", "aaaaaaaa-0000-0000-0000-000000000010"));
      }),
    ).rejects.toThrow(/monedas distintas/);
  });

  it("solo empareja tarjetas de crédito", async () => {
    await expect(
      asUser(db, ANA, (tx) => tx.query(insertCard("aaaaaaaa-0000-0000-0000-000000000012", "USD", CORRIENTE))),
    ).rejects.toThrow(/tarjetas de crédito/);
  });

  it("una tarjeta tiene como mucho una cuenta en la otra moneda", async () => {
    await expect(
      asUser(db, ANA, (tx) => tx.query(insertCard("aaaaaaaa-0000-0000-0000-000000000013", "USD", VISA))),
    ).rejects.toThrow(/accounts_paired_uidx|duplicate/);
  });

  it("la principal no puede cambiar de moneda ni de tipo mientras tenga pareja", async () => {
    await expect(asUser(db, ANA, (tx) => tx.query("update accounts set currency = 'USD' where id = $1", [VISA]))).rejects.toThrow(
      /otra moneda/,
    );
    await expect(asUser(db, ANA, (tx) => tx.query("update accounts set type = 'checking' where id = $1", [VISA]))).rejects.toThrow(
      /otra moneda/,
    );
  });

  it("se puede desemparejar y entonces la principal ya puede cambiar", async () => {
    const currency = await asUser(db, ANA, async (tx) => {
      await tx.query("update accounts set paired_account_id = null, archived_at = now() where id = $1", [VISA_USD]);
      await tx.query("update accounts set currency = 'USD' where id = $1", [VISA]);
      return one<{ currency: string }>(tx, "select currency from accounts where id = $1", [VISA]);
    });
    expect(currency.currency).toBe("USD");
  });

  it("no se puede emparejar con la tarjeta de otra persona", async () => {
    await expect(
      asUser(db, BETO, (tx) => tx.query(insertCard("bbbbbbbb-0000-0000-0000-000000000001", "USD", VISA))),
    ).rejects.toThrow(/principal|foreign key|violates/);
  });
});
