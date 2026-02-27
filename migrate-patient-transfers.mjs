import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_F4eEAw3JGzVo@ep-withered-sea-aiv46ynt-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: { rejectUnauthorized: false }
});

const sql = `
CREATE TABLE IF NOT EXISTS patient_transfers (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  from_psychologist_id INTEGER REFERENCES psychologists(id),
  to_psychologist_id INTEGER NOT NULL REFERENCES psychologists(id),
  transferred_by_admin_id INTEGER NOT NULL REFERENCES users(id),
  reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
`;

(async () => {
    const client = await pool.connect();
    try {
        console.log('Creating patient_transfers table...');
        const result = await client.query(sql);
        console.log('✅ Migration complete!');
    } catch (e) {
        console.error('❌ Error:', e.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
})();
