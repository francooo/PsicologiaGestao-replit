import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_O4rZuwycG6FT@ep-little-mud-a5s0bez0.us-east-2.aws.neon.tech/neondb?sslmode=require');

const email = 'andrewsfranco93@gmail.com';

console.log('🔍 Verificando usuário no banco de dados');
console.log('📧 Email:', email);
console.log('');

const users = await sql`
  SELECT id, username, email, full_name, role, status
  FROM users
  WHERE email = ${email}
`;

if (users.length === 0) {
    console.log('❌ USUÁRIO NÃO ENCONTRADO!');
    console.log('');
    console.log('Este é o problema! O email não existe no banco de dados.');
    console.log('');
    console.log('Por isso:');
    console.log('  ❌ Nenhum token foi gerado');
    console.log('  ❌ Nenhum email foi enviado');
    console.log('  ✅ Sistema retornou 200 OK (por segurança)');
    console.log('');
    console.log('💡 SOLUÇÃO:');
    console.log('   Você precisa criar um usuário com este email primeiro!');
    console.log('');
    console.log('   Opção 1: Registrar via interface');
    console.log('   - Acesse /auth-page');
    console.log('   - Clique em "Criar conta"');
    console.log('   - Use o email: andrewsfranco93@gmail.com');
    console.log('');
    console.log('   Opção 2: Atualizar email de usuário existente');
    console.log('   - Liste os usuários: node scripts/list-users.js');
    console.log('   - Atualize o email do usuário desejado');

} else {
    console.log('✅ USUÁRIO ENCONTRADO!');
    console.log('');
    console.log('📋 Dados:');
    console.log(JSON.stringify(users[0], null, 2));
    console.log('');
    console.log('✅ O sistema deveria ter:');
    console.log('   1. Gerado um token');
    console.log('   2. Salvo o token no banco');
    console.log('   3. Enviado o email');
    console.log('');
    console.log('⚠️  Se o email não chegou, verifique:');
    console.log('   - Pasta de spam');
    console.log('   - Logs do servidor para erros');
    console.log('   - Status da API key do Resend');
}
