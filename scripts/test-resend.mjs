// Script para testar comunicação com Resend API
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.RESEND_API_KEY || 're_C3afDVpG_BTRHpWzZxCNoeqbPNGRTt7ki';

console.log('🧪 Testando Comunicação com Resend API');
console.log('='.repeat(60));
console.log('');
console.log('🔑 API Key:', apiKey.substring(0, 8) + '...');
console.log('📧 Email de teste: andrewsfranco93@gmail.com');
console.log('');
console.log('⚠️  Nota: API key em modo teste só envia para andrewsfranco93@gmail.com');
console.log('');

const resend = new Resend(apiKey);

async function testResendConnection() {
    try {
        console.log('📤 Enviando email de teste...\n');

        const { data, error } = await resend.emails.send({
            from: 'ConsultaPsi <onboarding@resend.dev>',
            to: ['andrewsfranco93@gmail.com'],
            subject: 'Teste de Conexão - Resend API',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0097FB; margin: 0; font-size: 28px;">ConsultaPsi</h1>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; border-left: 4px solid #0097FB;">
            <h2 style="color: #0097FB; margin-top: 0;">✅ Teste de Conexão</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Este é um email de teste para validar a comunicação com a API do Resend.
            </p>
            
            <div style="background-color: #d4edda; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #155724;">
                ✅ <strong>Conexão estabelecida com sucesso!</strong>
              </p>
            </div>
            
            <p style="font-size: 14px; line-height: 1.6; color: #666;">
              <strong>Informações do teste:</strong><br>
              • Data/Hora: ${new Date().toLocaleString('pt-BR')}<br>
              • API Key: ${apiKey.substring(0, 8)}...<br>
              • Modo: Teste (apenas andrewsfranco93@gmail.com)<br>
            </p>
          </div>
          
          <div style="margin-top: 30px; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} ConsultaPsi - Sistema de Gestão em Psicologia
            </p>
          </div>
        </div>
      `
        });

        if (error) {
            console.error('❌ Erro ao enviar email:');
            console.error('');
            console.error('Código:', error.statusCode);
            console.error('Mensagem:', error.message);
            console.error('');

            if (error.statusCode === 403 && error.message.includes('testing emails')) {
                console.log('⚠️  LIMITAÇÃO DO RESEND:');
                console.log('   Esta API key está em modo teste');
                console.log('   Só pode enviar emails para: andrewsfranco93@gmail.com');
                console.log('');
                console.log('💡 Para enviar para outros emails:');
                console.log('   1. Acesse https://resend.com/domains');
                console.log('   2. Adicione e verifique um domínio');
                console.log('   3. Atualize o campo "from" no código');
            }

            console.error('Detalhes completos:', JSON.stringify(error, null, 2));
            return false;
        }

        console.log('✅ Email enviado com sucesso!');
        console.log('');
        console.log('📨 Detalhes do envio:');
        console.log('   ID da mensagem:', data?.id);
        console.log('   Para:', 'andrewsfranco93@gmail.com');
        console.log('   De:', 'ConsultaPsi <onboarding@resend.dev>');
        console.log('   Timestamp:', new Date().toISOString());
        console.log('');
        console.log('='.repeat(60));
        console.log('🎉 COMUNICAÇÃO COM RESEND: FUNCIONANDO!');
        console.log('='.repeat(60));
        console.log('');
        console.log('📬 Verifique a caixa de entrada de andrewsfranco93@gmail.com');
        console.log('');

        return true;

    } catch (error) {
        console.error('❌ Erro crítico ao testar Resend:');
        console.error('');
        console.error('Tipo:', typeof error);
        console.error('Mensagem:', error instanceof Error ? error.message : String(error));

        if (error instanceof Error && error.stack) {
            console.error('');
            console.error('Stack trace:');
            console.error(error.stack);
        }

        console.error('');
        console.error('💡 Possíveis causas:');
        console.error('   - API key inválida');
        console.error('   - Problemas de rede');
        console.error('   - Pacote Resend não instalado corretamente');

        return false;
    }
}

// Executar teste
const success = await testResendConnection();

if (success) {
    console.log('✅ Teste concluído com sucesso!');
    process.exit(0);
} else {
    console.log('❌ Teste falhou. Verifique os erros acima.');
    process.exit(1);
}
