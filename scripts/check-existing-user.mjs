import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_O4rZuwycG6FT@ep-little-mud-a5s0bez0.us-east-2.aws.neon.tech/neondb?sslmode=require');

const username = 'andrews.teixeira';

console.log('🔍 Buscando usuário:', username);
console.log('');

const users = await sql`
  SELECT id, username, email, full_name, role, status
  FROM users
  WHERE username = ${username}
`;

if (users.length === 0) {
    console.log('❌ Usuário NÃO encontrado');
} else {
    console.log('✅ Usuário ENCONTRADO!');
    console.log('');
    console.log('📋 Dados completos:');
    console.log(JSON.stringify(users[0], null, 2));
    console.log('');

    const expectedEmail = 'andrews.franco@afecomm.com.br';

    if (users[0].email === expectedEmail) {
        console.log('✅ Email está CORRETO:', expectedEmail);
        console.log('');
        console.log('🎉 Tudo pronto para recuperação de senha!');
        console.log('');
        console.log('📧 Para recuperar a senha:');
        console.log('   1. Acesse /password-recovery');
        console.log('   2. Insira o email:', expectedEmail);
        console.log('   3. Verifique os logs do servidor para o link');
    } else {
        console.log('⚠️  Email DIFERENTE do esperado!');
        console.log('');
        console.log('   Email atual:', users[0].email);
        console.log('   Email esperado:', expectedEmail);
        console.log('');
        console.log('Deseja atualizar o email? (será necessário executar outro script)');
    }
}
