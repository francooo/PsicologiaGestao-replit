import { pool } from "./db";
import { log } from "./log";

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
  } catch (error) {
    log(`startup migration failed: ${(error as Error).message}`);
    throw error;
  }
}
