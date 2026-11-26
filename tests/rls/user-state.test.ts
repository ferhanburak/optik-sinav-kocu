/**
 * @jest-environment node
 */
import type { Client } from "pg";

import { as, connect, createUser, describeDb, errorCode } from "./db";

// 42501 = insufficient privilege / RLS violation
const DENIED = "42501";

let db: Client;
let alice: string;
let bob: string;

beforeAll(async () => {
  if (!process.env.SUPABASE_DB_URL) return;
  db = await connect();
  alice = await createUser(db);
  bob = await createUser(db);
  await db.query(
    `insert into public.user_state (user_id, data) values ($1, '{"v": 2, "owner": "alice"}'), ($2, '{"v": 2, "owner": "bob"}')`,
    [alice, bob],
  );
});

afterAll(async () => {
  if (!db) return;
  await db.query("delete from auth.users where id = any($1)", [[alice, bob]]);
  await db.end();
});

describeDb("OPT-MOB-002 RLS keeps each user's study state private", () => {
  it("has row level security on every table in the public schema", async () => {
    const { rows } = await db.query(`select tablename from pg_tables where schemaname = 'public' and not rowsecurity`);
    expect(rows).toEqual([]);
  });

  it("lets a user read only their own state", async () => {
    const rows = await as(db, alice, async () => (await db.query("select user_id from public.user_state")).rows);
    expect(rows).toEqual([{ user_id: alice }]);
  });

  it("lets a user update and delete their own state", async () => {
    const counts = await as(db, alice, async () => {
      const updated = (await db.query(`update public.user_state set data = '{"v": 2}' where user_id = $1`, [alice])).rowCount;
      const deleted = (await db.query("delete from public.user_state where user_id = $1", [alice])).rowCount;
      return { updated, deleted };
    });
    expect(counts).toEqual({ updated: 1, deleted: 1 });
  });

  it("does not let a user change or delete someone else's state", async () => {
    const counts = await as(db, alice, async () => {
      const updated = (await db.query(`update public.user_state set data = '{}' where user_id = $1`, [bob])).rowCount;
      const deleted = (await db.query("delete from public.user_state where user_id = $1", [bob])).rowCount;
      return { updated, deleted };
    });
    expect(counts).toEqual({ updated: 0, deleted: 0 });
    const { rows } = await db.query("select data->>'owner' as owner from public.user_state where user_id = $1", [bob]);
    expect(rows).toEqual([{ owner: "bob" }]);
  });

  it("does not let a user write a row for another id", async () => {
    const code = await as(db, alice, () =>
      errorCode(db.query(`insert into public.user_state (user_id, data) values (gen_random_uuid(), '{}')`)),
    );
    expect(code).toBe(DENIED);
  });

  it("does not let a user move their row to another id", async () => {
    const code = await as(db, alice, () =>
      errorCode(db.query("update public.user_state set user_id = gen_random_uuid() where user_id = $1", [alice])),
    );
    expect(code).toBe(DENIED);
  });

  it("gives signed-out (anon) clients no access at all", async () => {
    const code = await as(db, null, () => errorCode(db.query("select user_id from public.user_state")));
    expect(code).toBe(DENIED);
  });
});
