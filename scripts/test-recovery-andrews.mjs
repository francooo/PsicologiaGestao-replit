// Script para testar recuperação de senha com email específico
import axios from 'axios';

const API_URL = 'http://localhost:5000';
const testEmail = 'andrews.franco@afecomm.com.br';

async function testPasswordRecoveryForEmail() {
    console.log('🧪 Testando Recuperação de Senha');
    console.log('='.repeat(60));
    console.log('\n📧 Email:', testEmail);
    console.log('🔄 Enviando requisição...\n');

    try {
        const response = await axios.post(`${API_URL}/api/recover-password`, {
            email: testEmail
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Requisição bem-sucedida!');
        console.log('📊 Status:', response.status);
        console.log('📝 Resposta:', JSON.stringify(response.data, null, 2));

        console.log('\n' + '='.repeat(60));
        console.log('📋 VERIFIQUE OS LOGS DO SERVIDOR PARA:');
        console.log('='.repeat(60));
        console.log('\n- 🔍 Verificação do email');
        console.log('- ✅ Usuário encontrado (ou não)');
        console.log('- 🔐 Token gerado');
        console.log('- 💾 Token salvo no banco');
        console.log('- 📧 Tentativa de envio de email');
        console.log('- 🔗 Link de recuperação');
        console.log('\n' + '='.repeat(60));

    } catch (error) {
        console.error('\n❌ Erro no teste:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Dados:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Erro:', error.message);
        }
    }
}

testPasswordRecoveryForEmail();
