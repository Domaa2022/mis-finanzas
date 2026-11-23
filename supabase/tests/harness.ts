/**
 * Arnés para probar las migraciones reales en Postgres (PGlite, Postgres en WASM)
 * sin necesitar Supabase ni Docker. Imita lo mínimo de Supabase:
 * el esquema `auth` con `auth.users` y `auth.uid()`, y los roles `anon`,
 * `authenticated` y `service_role` con los permisos por defecto.
 */
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(__dirname, "..", "migrations");

const SUPABASE_STUB = `
  create schema auth;
  create table auth.users (
    id uuid primary key,
    email text,
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
  $$;
  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`;

export type Db = PGlite;

export async function createTestDb(): Promise<Db> {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    try {
      await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
    } catch (error) {
      throw new Error(`Falló la migración ${file}: ${(error as Error).message}`);
    }
  }
  return db;
}

export async function createUser(db: Db, id: string, meta: Record<string, string> = {}, email = `${id.slice(0, 4)}@prueba.hn`) {
  await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)", [id, email, meta]);
}

/**
 * Ejecuta `fn` como un usuario autenticado (rol `authenticated` + JWT con `sub`),
 * dentro de una transacción. Si `rollback` es true, deshace los cambios al final.
 */
export async function asUser<T>(db: Db, userId: string, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: userId, role: "authenticated" })]);
    await tx.exec("set local role authenticated");
    return fn(tx);
  });
}

/** Primera fila de una consulta. */
export async function one<T>(q: Db | Transaction, sql: string, params: unknown[] = []): Promise<T> {
  const { rows } = await q.query<T>(sql, params);
  return rows[0];
}

/** Convierte bigint/numeric de Postgres a number. */
export const n = (v: unknown) => Number(v);
