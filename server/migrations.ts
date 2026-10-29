import { pool } from "./db";
import { log } from "./log";
import { DEFAULT_COMPANY_SLUG } from "@shared/schema";

/**
 * Small, additive, idempotent schema changes applied on startup (like the seeds),
 * so every database the server points at gets them without a manual db:push.
 * Only ADD COLUMN IF NOT EXISTS — never drops or rewrites data.
 */
export async function runStartupMigrations() {
  try {
    await pool.query(`
      ALTER TABLE patient_documents
        ADD COLUMN IF NOT EXISTS ai_summary text,
        ADD COLUMN IF NOT EXISTS ai_summary_at timestamp,
        ADD COLUMN IF NOT EXISTS ai_summary_model text
    `);
    await pool.query(`
      ALTER TABLE appointments
        ADD COLUMN IF NOT EXISTS session_type text
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS access_invites (
        id serial PRIMARY KEY,
        email text NOT NULL,
        role text NOT NULL DEFAULT 'admin',
        company_id integer,
        invited_by_user_id integer REFERENCES users(id),
        created_at timestamp NOT NULL DEFAULT now(),
        accepted_at timestamp,
        accepted_user_id integer REFERENCES users(id)
      )
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS access_invites_company_email_idx
        ON access_invites (COALESCE(company_id, 0), lower(email))
    `);
    // Sign-up date (Contas sem clínica); accounts that already exist stay without one
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at timestamp`);
    await pool.query(`ALTER TABLE users ALTER COLUMN created_at SET DEFAULT now()`);
    await migrateCompanies();
  } catch (error) {
    log(`startup migration failed: ${(error as Error).message}`);
    throw error;
  }
}

// Tables that hold clinic data directly; their children inherit the company via the parent.
const COMPANY_TABLES = [
  "psychologists",
  "rooms",
  "appointments",
  "transactions",
  "room_bookings",
  "patients",
  "invoices",
  "meetings",
  "commission_payout_configs",
  "commissions",
  "care_templates",
  "care_dispatches",
  "audit_logs",
];

/**
 * Multi-company base (fase 0): companies + memberships, company_id on the clinic tables,
 * and a one-time move of all existing data into "Empresa 1". Until every route writes
 * company_id itself, the column defaults to Empresa 1 so new rows keep landing there.
 */
async function migrateCompanies() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_migrations (
      name text PRIMARY KEY,
      applied_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS companies (
      id serial PRIMARY KEY,
      name text NOT NULL,
      slug text NOT NULL UNIQUE,
      cnpj text,
      logo_url text,
      status text NOT NULL DEFAULT 'active',
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS company_memberships (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      company_id integer NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      role text NOT NULL DEFAULT 'psychologist',
      status text NOT NULL DEFAULT 'active',
      created_at timestamp NOT NULL DEFAULT now(),
      CONSTRAINT company_memberships_user_company UNIQUE (user_id, company_id)
    )
  `);
  // Clinic logo (fase 4), stored like profile photos: Vercel's filesystem is ephemeral
  await pool.query(`
    ALTER TABLE companies
      ADD COLUMN IF NOT EXISTS logo_data bytea,
      ADD COLUMN IF NOT EXISTS logo_mime_type text
  `);
  // A fresh database may not have every table yet (they come from db:push).
  const { rows: present } = await pool.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename = ANY($1)`,
    [COMPANY_TABLES]
  );
  const tables = COMPANY_TABLES.filter((t) => present.some((r: { tablename: string }) => r.tablename === t));
  for (const table of tables) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS company_id integer REFERENCES companies(id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS ${table}_company_id_idx ON ${table} (company_id)`);
  }

  await runOnce("companies_backfill", async (client) => {
    await client.query(
      `INSERT INTO companies (name, slug) VALUES ('Empresa 1', $1) ON CONFLICT (slug) DO NOTHING`,
      [DEFAULT_COMPANY_SLUG]
    );
    const { rows } = await client.query(`SELECT id FROM companies WHERE slug = $1`, [DEFAULT_COMPANY_SLUG]);
    const companyId = Number(rows[0].id);

    for (const table of tables) {
      if (table === "care_templates") {
        // Only templates owned by a psychologist belong to the clinic; the rest stay global.
        await client.query(
          `UPDATE care_templates SET company_id = $1 WHERE company_id IS NULL AND psychologist_id IS NOT NULL`,
          [companyId]
        );
        continue;
      }
      await client.query(`UPDATE ${table} SET company_id = $1 WHERE company_id IS NULL`, [companyId]);
      await client.query(`ALTER TABLE ${table} ALTER COLUMN company_id SET DEFAULT ${companyId}`);
    }

    await client.query(
      `INSERT INTO company_memberships (user_id, company_id, role, status)
         SELECT id, $1, role, status FROM users
       ON CONFLICT (user_id, company_id) DO NOTHING`,
      [companyId]
    );
    log(`companies backfill: existing data moved to Empresa 1 (id ${companyId})`);
  });

  // Invites created before they were company-scoped belong to Empresa 1 (fase 1).
  await runOnce("access_invites_company", async (client) => {
    await client.query(
      `UPDATE access_invites SET company_id = (SELECT id FROM companies WHERE slug = $1) WHERE company_id IS NULL`,
      [DEFAULT_COMPANY_SLUG]
    );
  });

  // Fase 2: every insert now stores company_id, so the Empresa 1 default goes away and the
  // column becomes required — a missed insert path fails instead of landing in Empresa 1.
  await runOnce("company_id_required", async (client) => {
    const { rows } = await client.query(`SELECT id FROM companies WHERE slug = $1`, [DEFAULT_COMPANY_SLUG]);
    const companyId = Number(rows[0].id);
    // Templates a psychologist created while there was no default for this table
    if (tables.includes("care_templates")) {
      await client.query(
        `UPDATE care_templates SET company_id = $1 WHERE company_id IS NULL AND psychologist_id IS NOT NULL`,
        [companyId]
      );
    }
    for (const table of tables.filter((t) => t !== "care_templates")) {
      await client.query(`UPDATE ${table} SET company_id = $1 WHERE company_id IS NULL`, [companyId]);
      await client.query(`ALTER TABLE ${table} ALTER COLUMN company_id DROP DEFAULT`);
      await client.query(`ALTER TABLE ${table} ALTER COLUMN company_id SET NOT NULL`);
    }
  });

  // A patient's CPF is unique within a company, no longer across the whole system.
  if (tables.includes("patients")) {
    await runOnce("patients_cpf_per_company", async (client) => {
      const { rows } = await client.query(
        `SELECT c.conname FROM pg_constraint c
           JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
         WHERE c.conrelid = 'patients'::regclass AND c.contype = 'u'
           AND array_length(c.conkey, 1) = 1 AND a.attname = 'cpf'`
      );
      for (const { conname } of rows) {
        await client.query(`ALTER TABLE patients DROP CONSTRAINT "${conname}"`);
      }
      const { rows: existing } = await client.query(
        `SELECT 1 FROM pg_constraint WHERE conrelid = 'patients'::regclass AND conname = 'patients_company_cpf'`
      );
      if (existing.length === 0) {
        await client.query(`ALTER TABLE patients ADD CONSTRAINT patients_company_cpf UNIQUE (company_id, cpf)`);
      }
    });
  }
}

type Client = { query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }> };

/**
 * Runs a data migration once per database, recorded in app_migrations. Serverless cold
 * starts can get here concurrently: lock, then re-check inside the transaction.
 */
async function runOnce(name: string, migrate: (client: Client) => Promise<void>) {
  const { rows: done } = await pool.query(`SELECT 1 FROM app_migrations WHERE name = $1`, [name]);
  if (done.length > 0) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [name]);
    const { rows: again } = await client.query(`SELECT 1 FROM app_migrations WHERE name = $1`, [name]);
    if (again.length === 0) {
      await migrate(client);
      await client.query(`INSERT INTO app_migrations (name) VALUES ($1)`, [name]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
