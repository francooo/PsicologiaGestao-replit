import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_F4eEAw3JGzVo@ep-withered-sea-aiv46ynt-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: { rejectUnauthorized: false }
});

const queries = [
    `ALTER TABLE patients ADD COLUMN IF NOT EXISTS psychologist_id INTEGER REFERENCES psychologists(id)`,
    `UPDATE patients p SET psychologist_id = ps.id FROM psychologists ps WHERE ps.user_id = p.created_by AND p.psychologist_id IS NULL`,
];

(async () => {
    const client = await pool.connect();
    try {
        for (const q of queries) {
            console.log('Running:', q.substring(0, 60), '...');
            const result = await client.query(q);
            console.log('OK — rows affected:', result.rowCount);
        }
        console.log('\n✅ Migração concluída com sucesso!');
    } catch (e) {
        console.error('❌ Erro na migração:', e.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
})();
