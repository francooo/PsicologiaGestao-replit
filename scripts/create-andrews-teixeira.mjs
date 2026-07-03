import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';

const sql = neon(process.env.DATABASE_URL);

const userData = {
    username: 'andrews.teixeira',
    email: 'andrews.franco@afecomm.com.br',
    fullName: 'Andrews Teixeira',
    password: 'senha123', // Senha temporária - deve ser alterada após primeiro login
    role: 'admin',
    status: 'active'
};

console.log('👤 Criando usuário no banco de dados');
console.log('='.repeat(60));
console.log('');
console.log('📋 Dados do usuário:');
console.log('   Username:', userData.username);
console.log('   Email:', userData.email);
console.log('   Nome:', userData.fullName);
console.log('   Role:', userData.role);
console.log('   Senha temporária:', userData.password);
console.log('');

try {
    // Verificar se usuário já existe
    const existing = await sql`
    SELECT id FROM users 
    WHERE username = ${userData.username} OR email = ${userData.email}
  `;

    if (existing.length > 0) {
        console.log('⚠️  Usuário já existe no banco de dados!');
        console.log('   ID:', existing[0].id);
        process.exit(0);
    }

    // Hash da senha
    console.log('🔐 Gerando hash da senha...');
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Inserir usuário
    console.log('💾 Inserindo usuário no banco...');
    const result = await sql`
    INSERT INTO users (username, email, password, full_name, role, status)
    VALUES (
      ${userData.username},
      ${userData.email},
      ${hashedPassword},
      ${userData.fullName},
      ${userData.role},
      ${userData.status}
    )
    RETURNING id, username, email, full_name, role, status
  `;

    console.log('');
    console.log('✅ Usuário criado com sucesso!');
    console.log('');
    console.log('📊 Dados do usuário criado:');
    console.log(JSON.stringify(result[0], null, 2));
    console.log('');
    console.log('='.repeat(60));
    console.log('🔐 CREDENCIAIS DE ACESSO:');
    console.log('='.repeat(60));
    console.log('');
    console.log('   Username:', userData.username);
    console.log('   Email:', userData.email);
    console.log('   Senha:', userData.password);
    console.log('');
    console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!');
    console.log('');
    console.log('📧 Agora você pode usar a recuperação de senha:');
    console.log('   1. Acesse /password-recovery');
    console.log('   2. Insira o email:', userData.email);
    console.log('   3. Verifique os logs do servidor para o link de recuperação');
    console.log('');
    console.log('='.repeat(60));

} catch (error) {
    console.error('');
    console.error('❌ Erro ao criar usuário:', error.message);
    console.error('');
    if (error.detail) {
        console.error('Detalhes:', error.detail);
    }
}
