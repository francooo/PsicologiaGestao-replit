// Script para testar recuperação de senha
import axios from 'axios';

const API_URL = 'http://localhost:5000';

async function testPasswordRecovery() {
    console.log('🧪 Testando Sistema de Recuperação de Senha\n');
    console.log('='.repeat(60));

    // Email de teste (único que funciona com API key de teste do Resend)
    const testEmail = 'andrewsfranco93@gmail.com';

    console.log('\n📧 Email de teste:', testEmail);
    console.log('⚠️  Nota: API key do Resend está em modo teste');
    console.log('   Só funciona com: andrewsfranco93@gmail.com\n');

    try {
        console.log('🔄 Enviando requisição para /api/recover-password...\n');

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
        console.log('📋 PRÓXIMOS PASSOS:');
        console.log('='.repeat(60));
        console.log('\n1. Verifique os logs do servidor para ver:');
        console.log('   - ✅ Usuário encontrado');
        console.log('   - 🔐 Token gerado');
        console.log('   - 💾 Token salvo no banco');
        console.log('   - 📧 Email enviado');
        console.log('   - 🔗 Link de recuperação');

        console.log('\n2. Verifique o email em: andrewsfranco93@gmail.com');
        console.log('   - Assunto: "Recuperação de Senha - ConsultaPsi"');
        console.log('   - Remetente: ConsultaPsi <onboarding@resend.dev>');

        console.log('\n3. Clique no link do email ou copie do log do servidor');

        console.log('\n4. Teste o reset de senha:');
        console.log('   - Acesse o link');
        console.log('   - Insira nova senha');
        console.log('   - Faça login com a nova senha');

        console.log('\n' + '='.repeat(60));

    } catch (error) {
        console.error('\n❌ Erro no teste:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Dados:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Erro:', error.message);
        }

        console.log('\n💡 Possíveis causas:');
        console.log('   - Servidor não está rodando');
        console.log('   - Email não existe no banco de dados');
        console.log('   - Problema com variáveis de ambiente');
    }
}

// Executar teste
testPasswordRecovery();
