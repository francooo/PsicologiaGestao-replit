import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Conexão com o banco de dados estabelecida com sucesso!');
    
    const result = await client.query('SELECT NOW()');
    console.log('⏰ Hora do servidor:', result.rows[0].now);
    
    client.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao conectar com o banco de dados:', error.message);
    process.exit(1);
  }
}

testConnection();
