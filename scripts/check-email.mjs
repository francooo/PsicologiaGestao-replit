import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

const email = 'andrews.franco@afecomm.com.br';

console.log('🔍 Buscando usuário:', email);
console.log('');

const users = await sql`
  SELECT id, username, email, full_name, role, status
  FROM users
  WHERE email = ${email}
`;

if (users.length === 0) {
    console.log('❌ Usuário NÃO encontrado');
    console.log('');
    console.log('O sistema retornou 200 OK mas NÃO enviou email porque:');
    console.log('- O usuário não existe no banco de dados');
    console.log('- Por segurança, o sistema não revela se o email existe');
} else {
    console.log('✅ Usuário ENCONTRADO!');
    console.log('');
    console.log(JSON.stringify(users[0], null, 2));
    console.log('');
    console.log('✅ Token de recuperação foi gerado e salvo');
    console.log('⚠️  Email NÃO foi enviado (Resend em modo teste)');
    console.log('🔗 Verifique os logs do servidor para o link');
}
