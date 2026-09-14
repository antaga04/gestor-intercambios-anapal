import { Resend } from 'resend';
import { env } from '@/config/env';
import { verifyEmailTemplate } from '@/templates/verifyEmail';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export interface SendResult {
    ok: boolean;
    error?: string;
}

async function send(to: string, subject: string, html: string, text: string): Promise<SendResult> {
    if (!resend) {
        // No API key (local dev): print instead of sending so the flow can be tested.
        console.log(`[email] (not sent, RESEND_API_KEY missing) to=${to} subject="${subject}"\n${text}`);
        return { ok: true };
    }
    const { error } = await resend.emails.send({ from: env.EMAIL_FROM, to, subject, html, text });
    if (error) {
        console.error('[email] send failed:', error);
        return { ok: false, error: error.message };
    }
    return { ok: true };
}

export function sendVerificationEmail(to: string, name: string, token: string): Promise<SendResult> {
    const link = `${env.CLIENT_URL}/verificar-email?token=${encodeURIComponent(token)}`;
    const { subject, html, text } = verifyEmailTemplate({ name, link });
    return send(to, subject, html, text);
}
