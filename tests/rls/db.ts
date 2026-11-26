import { randomUUID } from 'node:crypto';
import { Client } from 'pg';

/**
 * Local Supabase Postgres with supabase/migrations applied. test-hub's
 * mobile-ci starts it (`supabase db start`) and sets SUPABASE_DB_URL; without
 * it (no Docker locally) the RLS suites are skipped.
 */
export const DB_URL = process.env.SUPABASE_DB_URL;
export const describeDb = DB_URL ? describe : describe.skip;

export async function connect() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  return client;
}

/** Creates a user the way sign-up does (auth.users insert fires the app's triggers). */
export async function createUser(client: Client, name = '') {
  const id = randomUUID();
  await client.query(
    `insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
     values ($1, 'authenticated', 'authenticated', $2, $3, now(), now())`,
    [id, `${id}@test.local`, JSON.stringify({ name })],
  );
  return id;
}

/**
 * Runs `fn` as the app does: as the `authenticated` role with the user's JWT
 * claims (or as `anon` when userId is null). Everything is rolled back.
 */
export async function as<T>(client: Client, userId: string | null, fn: () => Promise<T>): Promise<T> {
  await client.query('begin');
  try {
    if (userId) {
      await client.query('select set_config($1, $2, true)', [
        'request.jwt.claims',
        JSON.stringify({ sub: userId, role: 'authenticated' }),
      ]);
      await client.query('set local role authenticated');
    } else {
      await client.query('set local role anon');
    }
    return await fn();
  } finally {
    await client.query('rollback');
  }
}

/** Resolves with the Postgres error code, or null if the query succeeded. */
export async function errorCode(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    return (error as { code?: string }).code ?? 'unknown';
  }
}
