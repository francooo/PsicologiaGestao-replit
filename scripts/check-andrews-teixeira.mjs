import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_O4rZuwycG6FT@ep-little-mud-a5s0bez0.us-east-2.aws.neon.tech/neondb?sslmode=require');

const username = 'andrews.teixeira';
const email = 'andrews.franco@afecomm.com.br';

console.log('🔍 Buscando usuário:', username);
console.log('📧 Email esperado:', email);
console.log('');

const users = await sql`
  SELECT id, username, email, full_name, role, status
  FROM users
  WHERE username = ${username}
`;

if (users.length === 0) {
    console.log('❌ Usuário NÃO encontrado pelo username');
    console.log('');
    console.log('Vou buscar por email...');
    console.log('');

    const usersByEmail = await sql`
    SELECT id, username, email, full_name, role, status
    FROM users
    WHERE email = ${email}
  `;

    if (usersByEmail.length === 0) {
        console.log('❌ Usuário também NÃO encontrado pelo email');
        console.log('');
        console.log('Este usuário não existe no banco de dados.');
    } else {
        console.log('✅ Usuário ENCONTRADO pelo email!');
        console.log('');
        console.log(JSON.stringify(usersByEmail[0], null, 2));
    }
} else {
    console.log('✅ Usuário ENCONTRADO pelo username!');
    console.log('');
    console.log(JSON.stringify(users[0], null, 2));
    console.log('');

    if (users[0].email === email) {
        console.log('✅ Email está correto:', email);
        console.log('');
        console.log('🔐 Para recuperar a senha:');
        console.log('   1. Acesse /password-recovery');
        console.log('   2. Insira o email:', email);
        console.log('   3. Verifique os logs do servidor para o link');
        console.log('');
        console.log('⚠️  Limitação: Email só será enviado para andrewsfranco93@gmail.com');
        console.log('   Mas o token será gerado e você pode copiar o link dos logs!');
    } else {
        console.log('⚠️  Email no banco é diferente:', users[0].email);
        console.log('   Email esperado:', email);
        console.log('');
        console.log('Você precisa atualizar o email do usuário no banco.');
    }
}
