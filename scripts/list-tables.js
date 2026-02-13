import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function listTables() {
    try {
        const client = await pool.connect();
        console.log('✅ Conectado ao banco de dados!\n');

        // Lista todas as tabelas
        const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

        console.log('📋 Tabelas criadas no banco de dados:');
        console.log('=====================================');
        result.rows.forEach((row, index) => {
            console.log(`${index + 1}. ${row.table_name}`);
        });
        console.log(`\n✅ Total: ${result.rows.length} tabelas criadas`);

        client.release();
        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    }
}

listTables();
