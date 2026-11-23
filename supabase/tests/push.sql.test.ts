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

describe("push_subscriptions", () => {
  it("cada quien ve solo sus suscripciones", async () => {
    await asUser(db, ANA, (tx) =>
      tx.query("insert into push_subscriptions (endpoint, p256dh, auth) values ('https://push.ejemplo/ana', 'k', 'a')"),
    );
    const beto = await asUser(db, BETO, (tx) => one<{ c: number }>(tx, "select count(*)::int c from push_subscriptions"));
    expect(beto.c).toBe(0);
    const ana = await asUser(db, ANA, (tx) => one<{ c: number }>(tx, "select count(*)::int c from push_subscriptions"));
    expect(ana.c).toBe(1);
  });

  it("los usuarios no pueden crear notificaciones (solo el sistema)", async () => {
    await expect(
      asUser(db, ANA, (tx) => tx.query("insert into notifications (user_id, kind, title, body) values ($1, 'x', 'x', 'x')", [ANA])),
    ).rejects.toThrow(/row-level security/);
  });
});
