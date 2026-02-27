// Script para verificar se usuário existe no banco
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function checkUser() {
    console.log('🔍 Verificando usuário no banco de dados\n');
    console.log('='.repeat(60));

    const email = 'andrews.franco@afecomm.com.br';
    console.log('📧 Email:', email);

    try {
        const users = await sql`
      SELECT id, username, email, "fullName", role, status
      FROM users
      WHERE email = ${email}
    `;

        console.log('\n📊 Resultado da busca:');
        console.log('='.repeat(60));

        if (users.length === 0) {
            console.log('\n❌ Usuário NÃO encontrado no banco de dados');
            console.log('\n💡 Isso explica por que o sistema retorna a mensagem genérica:');
            console.log('   "Se o email existir, você receberá as instruções de recuperação."');
            console.log('\n⚠️  Por segurança, o sistema não informa se o email existe ou não.');
            console.log('\n📝 Para criar este usuário, você pode:');
            console.log('   1. Registrar via interface /auth-page');
            console.log('   2. Criar via script de criação de usuário');
            console.log('   3. Inserir diretamente no banco de dados');
        } else {
            console.log('\n✅ Usuário ENCONTRADO!');
            console.log('\n📋 Dados do usuário:');
            console.log(JSON.stringify(users[0], null, 2));

            console.log('\n✅ O sistema deve ter:');
            console.log('   - Gerado um token de recuperação');
            console.log('   - Salvo o token no banco de dados');
            console.log('   - Tentado enviar email');

            console.log('\n⚠️  Limitação do Resend:');
            console.log('   - API key em modo teste');
            console.log('   - Só envia para: andrewsfranco93@gmail.com');
            console.log('   - Email para ' + email + ' NÃO será enviado');
            console.log('   - MAS o token foi salvo e está válido!');

            console.log('\n🔗 Verifique os logs do servidor para ver o link de recuperação');
        }

        console.log('\n' + '='.repeat(60));

    } catch (error) {
        console.error('\n❌ Erro ao verificar usuário:', error.message);
    }
}

checkUser();
