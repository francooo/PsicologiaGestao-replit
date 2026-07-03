import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

console.log('🔍 Verificando tabelas no banco de dados\n');

try {
    // Listar todas as tabelas
    const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;

    console.log('📊 Tabelas encontradas:');
    console.log('');

    tables.forEach((table, index) => {
        const hasPasswordReset = table.table_name.includes('password');
        console.log(`${index + 1}. ${table.table_name} ${hasPasswordReset ? '🔐' : ''}`);
    });

    console.log('');

    const hasPasswordResetTable = tables.some(t =>
        t.table_name === 'password_reset_tokens'
    );

    if (hasPasswordResetTable) {
        console.log('✅ Tabela password_reset_tokens EXISTE!');
    } else {
        console.log('❌ Tabela password_reset_tokens NÃO EXISTE!');
        console.log('');
        console.log('💡 Isso explica por que o sistema não está salvando tokens.');
        console.log('');
        console.log('Solução: Criar a tabela executando:');
        console.log('  npm run db:push');
        console.log('');
        console.log('Ou criar manualmente com SQL:');
        console.log('');
        console.log(`CREATE TABLE password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);`);
    }

} catch (error) {
    console.error('❌ Erro ao verificar tabelas:', error.message);
}
