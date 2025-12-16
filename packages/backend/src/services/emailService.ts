import { Resend } from 'resend';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('email-service');

class EmailService {
  private resend: Resend | null = null;
  private fromEmail: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';

    if (apiKey) {
      this.resend = new Resend(apiKey);
      logger.info('Email service initialized with Resend');
    } else {
      logger.warn('RESEND_API_KEY not configured. Emails will be logged only.');
    }
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Redefinir Senha</h1>
            </div>
            <div class="content">
              <p>Olá,</p>
              <p>Você solicitou a redefinição de senha da sua conta UpCar Aspiradores.</p>
              <p>Clique no botão abaixo para criar uma nova senha:</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Redefinir Senha</a>
              </div>
              <p>Ou copie e cole este link no seu navegador:</p>
              <p style="word-break: break-all; color: #6b7280; font-size: 14px;">${resetUrl}</p>
              <div class="warning">
                <strong>⚠️ Importante:</strong> Este link expira em 1 hora por motivos de segurança.
              </div>
              <p>Se você não solicitou esta redefinição, ignore este e-mail. Sua senha permanecerá inalterada.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} UpCar Aspiradores. Todos os direitos reservados.</p>
              <p>Este é um e-mail automático, por favor não responda.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
Redefinir Senha - UpCar Aspiradores

Olá,

Você solicitou a redefinição de senha da sua conta UpCar Aspiradores.

Clique no link abaixo para criar uma nova senha:
${resetUrl}

⚠️ Importante: Este link expira em 1 hora por motivos de segurança.

Se você não solicitou esta redefinição, ignore este e-mail. Sua senha permanecerá inalterada.

---
© ${new Date().getFullYear()} UpCar Aspiradores. Todos os direitos reservados.
Este é um e-mail automático, por favor não responda.
    `;

    if (this.resend) {
      try {
        await this.resend.emails.send({
          from: this.fromEmail,
          to,
          subject: 'Redefinir sua senha - UpCar Aspiradores',
          html: htmlContent,
          text: textContent,
        });
        logger.info(`Password reset email sent to: ${to}`);
      } catch (error) {
        logger.error('Failed to send password reset email:', error);
        throw new Error('Failed to send email');
      }
    } else {
      // Development mode - log the reset URL
      logger.info(`[DEV MODE] Password reset email for: ${to}`);
      logger.info(`[DEV MODE] Reset URL: ${resetUrl}`);
      logger.info(`[DEV MODE] Token: ${resetToken}`);
    }
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Bem-vindo ao UpCar! 🎉</h1>
            </div>
            <div class="content">
              <p>Olá ${name},</p>
              <p>Seja bem-vindo ao UpCar Aspiradores! Estamos felizes em tê-lo conosco.</p>
              <p>Agora você pode:</p>
              <ul>
                <li>Escanear QR codes das máquinas</li>
                <li>Fazer pagamentos via PIX</li>
                <li>Gerenciar seu saldo e histórico</li>
                <li>Assinar nosso plano mensal ilimitado</li>
              </ul>
              <p>Qualquer dúvida, estamos à disposição!</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} UpCar Aspiradores. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    if (this.resend) {
      try {
        await this.resend.emails.send({
          from: this.fromEmail,
          to,
          subject: 'Bem-vindo ao UpCar Aspiradores! 🎉',
          html: htmlContent,
        });
        logger.info(`Welcome email sent to: ${to}`);
      } catch (error) {
        logger.error('Failed to send welcome email:', error);
        // Don't throw - welcome email is not critical
      }
    } else {
      logger.info(`[DEV MODE] Welcome email for: ${to} (${name})`);
    }
  }
}

export const emailService = new EmailService();
