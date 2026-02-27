import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_O4rZuwycG6FT@ep-little-mud-a5s0bez0.us-east-2.aws.neon.tech/neondb?sslmode=require');

const userId = 1; // ID do usuário andrews

console.log('🔍 Verificando tokens de recuperação de senha');
console.log('👤 User ID:', userId);
console.log('');

// Verificar tokens recentes (últimas 24 horas)
const tokens = await sql`
  SELECT token, user_id, expires_at, used, created_at
  FROM password_reset_tokens
  WHERE user_id = ${userId}
  AND created_at > NOW() - INTERVAL '24 hours'
  ORDER BY created_at DESC
  LIMIT 5
`;

if (tokens.length === 0) {
    console.log('❌ NENHUM TOKEN ENCONTRADO!');
    console.log('');
    console.log('Isso significa que:');
    console.log('  ❌ O sistema NÃO gerou o token');
    console.log('  ❌ O email NÃO foi enviado');
    console.log('');
    console.log('💡 Possíveis causas:');
    console.log('   1. Erro no código de geração de token');
    console.log('   2. Erro ao salvar no banco de dados');
    console.log('   3. Usuário não está com status "active"');
    console.log('');
    console.log('🔍 Verifique os logs do servidor para mais detalhes');

} else {
    console.log('✅ TOKENS ENCONTRADOS!');
    console.log('');
    console.log(`📊 Total: ${tokens.length} token(s) nas últimas 24h`);
    console.log('');

    tokens.forEach((token, index) => {
        const isExpired = new Date(token.expires_at) < new Date();
        const createdAt = new Date(token.created_at);

        console.log(`Token ${index + 1}:`);
        console.log(`  🔑 Token: ${token.token.substring(0, 16)}...`);
        console.log(`  📅 Criado em: ${createdAt.toLocaleString('pt-BR')}`);
        console.log(`  ⏰ Expira em: ${new Date(token.expires_at).toLocaleString('pt-BR')}`);
        console.log(`  ${isExpired ? '❌' : '✅'} Status: ${isExpired ? 'EXPIRADO' : 'VÁLIDO'}`);
        console.log(`  ${token.used ? '✅' : '⏳'} Usado: ${token.used ? 'SIM' : 'NÃO'}`);
        console.log('');

        if (!isExpired && !token.used) {
            const resetLink = `http://localhost:5000/reset-password?token=${token.token}`;
            console.log('  🔗 Link de recuperação:');
            console.log(`  ${resetLink}`);
            console.log('');
        }
    });

    console.log('='.repeat(60));
    console.log('📧 SOBRE O EMAIL:');
    console.log('='.repeat(60));
    console.log('');
    console.log('Se o token foi gerado mas o email não chegou:');
    console.log('  1. ✅ Verifique a pasta de SPAM');
    console.log('  2. 🔍 Verifique os logs do servidor para erros de envio');
    console.log('  3. 🔗 Use o link acima diretamente (não precisa do email)');
    console.log('');
}
