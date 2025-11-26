import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'Sixth Degree <notifications@mail.sixthdegree.app>';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY is missing. Email not sent.');
    console.log(`[Mock Email] To: ${to}, Subject: ${subject}`);
    return { success: false, error: 'Missing API Key' };
  }

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: to,
      subject: subject,
      html: html,
    });

    return { success: true, data };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { success: false, error };
  }
}

export function getPasswordResetTemplate(resetUrl: string) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Reset Your Password</h2>
      <p>You requested a password reset for your Sixth Degree account.</p>
      <p>Click the button below to set a new password. This link is valid for 1 hour.</p>
      <a href="${resetUrl}" style="display: inline-block; background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">
        Reset Password
      </a>
      <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;
}

export function getConnectionRequestTemplate(requesterName: string, acceptUrl: string) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>New Connection Request</h2>
      <p><strong>${requesterName}</strong> wants to connect with you on Sixth Degree.</p>
      <p>Connecting allows you to search through each other's networks and find new opportunities.</p>
      <a href="${acceptUrl}" style="display: inline-block; background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">
        View Request
      </a>
    </div>
  `;
}
