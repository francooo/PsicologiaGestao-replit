
import { Resend } from 'resend';
import { User } from '@shared/schema';

// Initialize Resend with API key
if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY not set. Password recovery emails will not be sent.');
}
const resend = new Resend(process.env.RESEND_API_KEY);

// Get the public URL for the application
const getAppUrl = () => {
  // First check for explicitly set APP_URL
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  // Use Replit's dev domain if available
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  // Fallback for local development
  return 'http://localhost:5000';
};

export const sendPasswordResetEmail = async (user: User, resetToken: string) => {
  const appUrl = getAppUrl();
  const resetLink = `${appUrl}/reset-password?token=${resetToken}`;

  // In development, log the reset link instead of sending email
  if (process.env.NODE_ENV !== 'production') {
    console.log('📧 DESENVOLVIMENTO: Email de recuperação seria enviado para:', user.email);
    console.log('🔗 Link de recuperação:', resetLink);
    console.log('⚠️  Link válido por 1 hora. Use este link para testar a recuperação de senha.');
    // return { id: 'dev-mode', email: user.email }; // Comentado para permitir envio real
  }

  try {
    // Validate email and API key
    if (!user.email || !user.email.includes('@')) {
      throw new Error('Email do usuário inválido');
    }

    console.log('📧 Enviando email para:', user.email);

    const { data, error } = await resend.emails.send({
      from: 'ConsultaPsi <onboarding@resend.dev>',
      to: [user.email],
      subject: 'Recuperação de Senha - ConsultaPsi',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0097FB; margin: 0; font-size: 28px;">ConsultaPsi</h1>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; border-left: 4px solid #0097FB;">
            <h2 style="color: #0097FB; margin-top: 0;">Recuperação de Senha</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #333;">Olá <strong>${user.fullName}</strong>,</p>
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Recebemos uma solicitação para redefinir sua senha. Se você não fez esta solicitação, 
              por favor ignore este email e sua senha permanecerá inalterada.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color: #0097FB; color: white; padding: 14px 28px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;
                        font-weight: bold; font-size: 16px;">
                🔐 Redefinir Senha
              </a>
            </div>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #856404;">
                ⏰ <strong>Este link é válido por apenas 1 hora</strong> por motivos de segurança.
              </p>
            </div>
            
            <p style="font-size: 14px; line-height: 1.6; color: #666;">
              Se o botão não funcionar, você pode copiar e colar o link abaixo no seu navegador:
            </p>
            <p style="word-break: break-all; font-size: 12px; color: #666; background-color: #f1f1f1; padding: 10px; border-radius: 4px;">
              ${resetLink}
            </p>
          </div>
          
          <div style="margin-top: 30px; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              Este é um email automático. Por favor, não responda a este email.
            </p>
            <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
              © ${new Date().getFullYear()} ConsultaPsi - Sistema de Gestão em Psicologia
            </p>
          </div>
        </div>
      `
    });

    if (error) {
      console.error('❌ Erro detalhado do Resend:', error);
      const err = error as any;

      // Handle specific Resend API limitations
      if (err.statusCode === 403 && err.message && err.message.includes('You can only send testing emails to your own email address')) {
        console.log('⚠️  RESEND LIMITATION: Este é um API key de teste que só pode enviar emails para: andrewsfranco93@gmail.com');
        console.log('🔗 Para enviar para outros emails, verifique um domínio em resend.com/domains');

        // In development/testing, log the reset link instead of failing completely
        console.log('📝 Link de recuperação (para teste manual):', resetLink);
        console.log('✅ Token gerado com sucesso. Use o link acima para testar o reset de senha.');
        return { id: 'resend-limitation', email: user.email, testLink: resetLink };
      }

      console.error('❌ Tipo do erro:', typeof error);
      console.error('❌ Conteúdo do erro:', JSON.stringify(error, null, 2));
      throw new Error(`Falha no envio do email via Resend: ${error.message || JSON.stringify(error)}`);
    }

    console.log('✅ Email de recuperação enviado com sucesso via Resend!');
    console.log('📨 Detalhes do envio:', {
      to: user.email,
      messageId: data?.id,
      from: 'ConsultaPsi <onboarding@resend.dev>',
      timestamp: new Date().toISOString()
    });

    return data;
  } catch (error) {
    console.error('❌ Erro crítico no envio de email:', error);
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('❌ Tipo do erro:', typeof error);
    if (error instanceof Error) {
      console.error('❌ Mensagem do erro:', error.message);
    }
    throw error;
  }
};
