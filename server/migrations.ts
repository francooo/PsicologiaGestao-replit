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
  } catch (error) {
    log(`startup migration failed: ${(error as Error).message}`);
    throw error;
  }
}
