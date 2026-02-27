// Script para criar usuário via API de registro
import axios from 'axios';

const API_URL = 'http://localhost:5000';

const userData = {
    username: 'andrews.teixeira',
    email: 'andrews.franco@afecomm.com.br',
    password: 'senha123',
    confirmPassword: 'senha123',
    fullName: 'Andrews Teixeira',
    role: 'admin'
};

console.log('👤 Criando usuário via API de registro');
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
    console.log('🔄 Enviando requisição para /api/register...\n');

    const response = await axios.post(`${API_URL}/api/register`, userData, {
        headers: {
            'Content-Type': 'application/json'
        }
    });

    console.log('✅ Usuário criado com sucesso!');
    console.log('📊 Status:', response.status);
    console.log('📝 Resposta:', JSON.stringify(response.data, null, 2));

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
    console.log('   3. Verifique os logs do servidor para o link');
    console.log('');
    console.log('='.repeat(60));

} catch (error) {
    console.error('\n❌ Erro ao criar usuário:');
    if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Dados:', JSON.stringify(error.response.data, null, 2));
    } else {
        console.error('Erro:', error.message);
    }
}
