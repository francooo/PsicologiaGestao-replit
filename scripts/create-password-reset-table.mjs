import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

console.log('🔧 Criando tabela password_reset_tokens\n');

try {
    await sql`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT FALSE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `;

    console.log('✅ Tabela password_reset_tokens criada com sucesso!');
    console.log('');

    // Criar índices para melhor performance
    console.log('📊 Criando índices...');

    await sql`
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id 
    ON password_reset_tokens(user_id)
  `;

    await sql`
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token 
    ON password_reset_tokens(token)
  `;

    await sql`
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at 
    ON password_reset_tokens(expires_at)
  `;

    console.log('✅ Índices criados com sucesso!');
    console.log('');
    console.log('='.repeat(60));
    console.log('🎉 CONFIGURAÇÃO COMPLETA!');
    console.log('='.repeat(60));
    console.log('');
    console.log('Agora você pode:');
    console.log('  1. Testar a recuperação de senha');
    console.log('  2. O token será salvo no banco');
    console.log('  3. O email será enviado via Resend');
    console.log('');

} catch (error) {
    console.error('❌ Erro ao criar tabela:', error.message);
    if (error.detail) {
        console.error('Detalhes:', error.detail);
    }
}
