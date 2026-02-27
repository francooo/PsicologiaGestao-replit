import 'dotenv/config';
import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function listTables() {
    try {
        console.log('✅ Conectado ao banco de dados!\n');

        // Lista todas as tabelas
        const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

        console.log('📋 Tabelas criadas no banco de dados:');
        console.log('=====================================\n');

        const tables = result.rows.map((row) => row.table_name);
        tables.forEach((table, index) => {
            console.log(`${(index + 1).toString().padStart(2, ' ')}. ${table}`);
        });

        console.log(`\n✅ Total: ${tables.length} tabelas criadas com sucesso!`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    }
}

listTables();
