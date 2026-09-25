// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

let db: PGlite;
const owner = '00000000-0000-4000-8000-000000000001';
const stranger = '00000000-0000-4000-8000-000000000002';
const report = '10000000-0000-4000-8000-000000000001';
const migration = readFileSync(new URL('../../../supabase/migrations/20260925090000_workbench_privacy_and_usage.sql', import.meta.url), 'utf8');

beforeAll(async () => {
  db = new PGlite();
  // A minimal existing database fixture (not a rewrite of the old migration
  // history, which contains known duplicate DDL). Execute the actual new SQL.
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT jsonb_build_object('is_anonymous',current_setting('request.jwt.claim.is_anonymous',true)) $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;
    GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;
    CREATE TYPE public.app_role AS ENUM ('admin','user','premium');
    CREATE TABLE user_roles(user_id uuid, role app_role);
    CREATE FUNCTION public.has_role(_user_id uuid,_role app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id=_user_id AND role=_role) $$;
    CREATE TABLE idea_reports(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, idea text, title text, brief jsonb DEFAULT '{}',
      lovable_prompt text, concept_image_url text, logo_image_url text, highlights text[], thesis_statement text, expanded_ideas jsonb,
      alt_prompts jsonb, auto_analysis jsonb, landing_page_html text, created_at timestamptz DEFAULT now());
    CREATE TABLE simulator_captures(id uuid DEFAULT gen_random_uuid(), user_id uuid, idea text);
    CREATE TABLE idea_perspectives(id uuid DEFAULT gen_random_uuid(),report_id uuid REFERENCES idea_reports, content text);
    CREATE TABLE idea_stack_items(id uuid DEFAULT gen_random_uuid(),report_id uuid REFERENCES idea_reports, content text);
    CREATE TABLE agent_events(id uuid DEFAULT gen_random_uuid(),report_id uuid REFERENCES idea_reports, data jsonb);
    CREATE TABLE org_decisions(id uuid DEFAULT gen_random_uuid(),content text);
    CREATE TABLE signal_raw(id uuid DEFAULT gen_random_uuid(),body text);
    CREATE TABLE mcp_usage_log(id uuid DEFAULT gen_random_uuid(),args jsonb);
    ALTER TABLE simulator_captures ENABLE ROW LEVEL SECURITY;
    ALTER TABLE idea_reports ENABLE ROW LEVEL SECURITY;
    ALTER TABLE idea_perspectives ENABLE ROW LEVEL SECURITY;
    ALTER TABLE idea_stack_items ENABLE ROW LEVEL SECURITY;
    ALTER TABLE agent_events ENABLE ROW LEVEL SECURITY;
    CREATE POLICY old_unsafe_capture_policy ON simulator_captures FOR ALL USING(true) WITH CHECK(true);
    CREATE POLICY old_unsafe_report_policy ON idea_reports FOR ALL USING(true) WITH CHECK(true);
    CREATE POLICY old_unsafe_stack_policy ON idea_stack_items FOR ALL USING(true) WITH CHECK(true);
    CREATE POLICY old_unsafe_perspective_policy ON idea_perspectives FOR ALL USING(true) WITH CHECK(true);
    CREATE POLICY old_unsafe_event_policy ON agent_events FOR ALL USING(true) WITH CHECK(true);
    GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO anon,authenticated;
    CREATE FUNCTION match_decisions() RETURNS SETOF org_decisions LANGUAGE sql SECURITY DEFINER AS $$ SELECT * FROM org_decisions $$;
  `);
  try { await db.exec(migration); } catch (error) {
    const err = error as { position?: string; internalPosition?: string; internalQuery?: string; message?: string };
    console.error('Migration SQL failure', err.message, err.position, err.internalPosition, err.internalQuery);
    throw error;
  }
  await db.query('INSERT INTO idea_reports(id,user_id,idea) VALUES ($1,$2,$3)', [report, owner, 'Private question']);
  await db.query('INSERT INTO simulator_captures(user_id,idea) VALUES ($1,$2)', [owner, 'Private backup']);
  await db.query('INSERT INTO idea_perspectives(report_id,content) VALUES ($1,$2)', [report, 'Private perspective']);
  await db.query('INSERT INTO idea_stack_items(report_id,content) VALUES ($1,$2)', [report, 'Private insight']);
  await db.query('INSERT INTO agent_events(report_id,data) VALUES ($1,$2)', [report, { private: true }]);
  await db.exec("INSERT INTO org_decisions(content) VALUES ('Internal strategy')");
}, 20_000);
afterAll(async () => { if (db) await db.close(); });
beforeEach(async () => {
  await db.exec('RESET ROLE; TRUNCATE ai_request_reservations, ai_usage_subjects CASCADE; UPDATE idea_reports SET sharing_enabled=false;');
});
async function identity(id: string, role: 'authenticated' | 'anon' | 'service_role' = 'authenticated') {
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false), set_config('request.jwt.claim.role',$2,false)", [id, role]);
  await db.query("SELECT set_config('request.jwt.claim.is_anonymous','false',false)");
  await db.exec(`SET ROLE ${role}`);
}
async function reserve(subject: string, fingerprint: string, overrides: Partial<{ guest: boolean; trial: string; cost: number; daily: number; guestLimit: number; concurrency: number; globalLimit: number }> = {}) {
  const o = { guest: true, trial: 'trial-a', cost: 1, daily: 120, guestLimit: 24, concurrency: 4, globalLimit: 1000, ...overrides };
  const result = await db.query<{ result: Record<string, unknown> }>('SELECT public.reserve_ai_request($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) result', [subject, 'workbench', fingerprint.padEnd(64, '0'), o.cost, o.guest, o.trial, o.daily, o.guestLimit, o.concurrency, o.globalLimit]);
  return result.rows[0].result;
}
async function finish(id: unknown, status = 200) {
  await db.query('SELECT public.finish_ai_request($1,$2,$3)', [id, status, { report: 'finished' }]);
}

describe('actual Postgres RLS and sharing migration', () => {
  it('allows the owner and isolates a second account across report, perspectives, stack, events', async () => {
    await identity(owner);
    for (const table of ['idea_reports','idea_perspectives','idea_stack_items','agent_events','simulator_captures']) expect((await db.query(`SELECT * FROM ${table}`)).rows).toHaveLength(1);
    await identity(stranger);
    for (const table of ['idea_reports','idea_perspectives','idea_stack_items','agent_events','simulator_captures']) expect((await db.query(`SELECT * FROM ${table}`)).rows).toHaveLength(0);
    await expect(db.query('INSERT INTO simulator_captures(user_id,idea) VALUES ($1,$2)', [owner, 'spoofed'])).rejects.toThrow(/row-level security/i);
    await expect(db.query('INSERT INTO idea_stack_items(report_id,content) VALUES ($1,$2)', [report, 'injected'])).rejects.toThrow(/row-level security/i);
    await expect(db.query('INSERT INTO idea_perspectives(report_id,content) VALUES ($1,$2)', [report, 'injected'])).rejects.toThrow(/row-level security/i);
    expect((await db.query('UPDATE idea_reports SET user_id=$1 RETURNING id', [stranger])).rows).toHaveLength(0);
  });
  it('defaults to private, requires owner sharing, and revokes immediately', async () => {
    await identity('', 'anon');
    expect((await db.query<{ result: unknown }>('SELECT get_shared_report($1) result', [report])).rows[0].result).toBeNull();
    await identity(stranger);
    await expect(db.query('SELECT set_report_sharing($1,true)', [report])).rejects.toThrow(/not owned/i);
    await identity(owner);
    await db.query('SELECT set_report_sharing($1,true)', [report]);
    await identity('', 'anon');
    const shared = (await db.query<{ result: Record<string, unknown> }>('SELECT get_shared_report($1) result', [report])).rows[0].result;
    expect(shared.idea).toBe('Private question');
    expect(shared.user_id).toBeUndefined();
    expect(shared.purpose).toBe('build');
    expect(shared.schema_version).toBe(1);
    await identity(owner);
    await db.query('SELECT set_report_sharing($1,false)', [report]);
    await identity('', 'anon');
    expect((await db.query<{ result: unknown }>('SELECT get_shared_report($1) result', [report])).rows[0].result).toBeNull();
  });
  it('does not allow guest owners to bypass account-only sharing through direct updates', async () => {
    await identity(owner);
    await db.query("SELECT set_config('request.jwt.claim.is_anonymous','true',false)");
    await expect(db.query('SELECT set_report_sharing($1,true)', [report])).rejects.toThrow(/Sign in/i);
    await expect(db.query('UPDATE idea_reports SET sharing_enabled=true WHERE id=$1', [report])).rejects.toThrow(/row-level security/i);
    expect((await db.query('SELECT * FROM idea_reports')).rows).toHaveLength(1);
  });
  it('closes internal data and security-definer bypasses for ordinary accounts', async () => {
    await identity(stranger);
    expect((await db.query('SELECT * FROM org_decisions')).rows).toHaveLength(0);
    await expect(db.query("INSERT INTO org_decisions(content) VALUES ('bad')")).rejects.toThrow(/row-level security/i);
    await expect(db.query('SELECT * FROM match_decisions()')).rejects.toThrow(/permission denied/i);
    await expect(db.query('SELECT * FROM ai_request_reservations')).rejects.toThrow(/permission denied/i);
    await expect(reserve('spoof', 'a')).rejects.toThrow(/permission denied/i);
  });
});

describe('durable usage ledger', () => {
  beforeEach(async () => identity('', 'service_role'));
  it('serializes duplicate runs and replays only completed results', async () => {
    const results = await Promise.all([reserve('same-user', 'a'), reserve('same-user', 'a')]);
    expect(results.map(r => r.state).sort()).toEqual(['duplicate','reserved']);
    const accepted = results.find(r => r.state === 'reserved')!;
    await finish(accepted.id);
    expect(await reserve('same-user', 'a')).toMatchObject({ state: 'replay', response: { report: 'finished' } });
    expect((await db.query('SELECT * FROM ai_request_reservations')).rows).toHaveLength(1);
  });
  it('allows only one guest primary question and charges attempted provider failures', async () => {
    const first = await reserve('guest', 'a', { cost: 6, guestLimit: 6 });
    await finish(first.id, 500);
    expect(await reserve('guest', 'b', { trial: 'different' })).toMatchObject({ state: 'limited', code: 'GUEST_TRIAL_USED' });
    expect(await reserve('guest', 'c', { cost: 1, guestLimit: 6 })).toMatchObject({ state: 'limited', code: 'GUEST_TRIAL_USED' });
  });
  it('bounds simultaneous distinct calls and releases the slot after completion', async () => {
    const first = await reserve('user', 'a', { concurrency: 1, guest: false });
    expect(await reserve('user', 'b', { concurrency: 1, guest: false })).toMatchObject({ state: 'busy' });
    await finish(first.id);
    expect(await reserve('user', 'b', { concurrency: 1, guest: false })).toMatchObject({ state: 'reserved' });
  });
  it('enforces daily account and global circuit limits across newly created identities', async () => {
    const first = await reserve('registered', 'a', { guest: false, cost: 2, daily: 2 });
    await finish(first.id);
    expect(await reserve('registered', 'b', { guest: false, daily: 2 })).toMatchObject({ state: 'limited', code: 'DAILY_LIMIT' });
    expect(await reserve('new-anonymous-user', 'c', { globalLimit: 2 })).toMatchObject({ state: 'limited', code: 'GLOBAL_LIMIT' });
  });
});
