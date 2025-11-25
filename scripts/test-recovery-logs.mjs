// Script para testar recuperação de senha e verificar logs
import axios from 'axios';

const API_URL = 'http://localhost:5000';
const testEmail = 'andrewsfranco93@gmail.com';

console.log('🧪 Testando Recuperação de Senha');
console.log('='.repeat(60));
console.log('');
console.log('📧 Email:', testEmail);
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
    console.log('');
    console.log('='.repeat(60));
    console.log('📋 VERIFIQUE OS LOGS DO SERVIDOR AGORA!');
    console.log('='.repeat(60));
    console.log('');
    console.log('Procure por:');
    console.log('  🔍 "Verificando recuperação de senha para email"');
    console.log('  ✅ "Usuário encontrado"');
    console.log('  🔐 "Token gerado"');
    console.log('  💾 "Token salvo no banco"');
    console.log('  📧 "Enviando email de recuperação"');
    console.log('  🔑 "Usando API Key: re_VnJA3..."');
    console.log('  ✅ "Email de recuperação enviado com sucesso"');
    console.log('  🔗 Link de recuperação');
    console.log('');

} catch (error) {
    console.error('\n❌ Erro no teste:');
    if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Dados:', JSON.stringify(error.response.data, null, 2));
    } else {
        console.error('Erro:', error.message);
    }
}
