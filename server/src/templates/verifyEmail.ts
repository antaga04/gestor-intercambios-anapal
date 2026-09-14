export interface VerifyEmailTemplateData {
    name: string;
    link: string;
}

const escapeHtml = (s: string) =>
    s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function verifyEmailTemplate({ name, link }: VerifyEmailTemplateData): {
    subject: string;
    html: string;
    text: string;
} {
    const safeName = escapeHtml(name);
    return {
        subject: 'Verifica tu cuenta de Intercambios ANAPAL',
        text: `Hola ${name},\n\nConfirma tu cuenta abriendo este enlace (caduca en 24 horas):\n${link}\n\nSi no has creado esta cuenta, ignora este email.`,
        html: `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Helvetica,Arial,sans-serif;color:#222;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;padding:32px;">
        <tr><td>
          <h1 style="margin:0 0 8px;font-size:22px;color:#ff660d;">Intercambios ANAPAL</h1>
          <p style="margin:0 0 16px;font-size:16px;">Hola <strong>${safeName}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.5;">Gracias por registrar tu administración. Confirma tu cuenta pulsando el botón. El enlace caduca en 24 horas.</p>
          <p style="margin:0 0 24px;">
            <a href="${link}" style="display:inline-block;background:#ff660d;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;">Verificar mi cuenta</a>
          </p>
          <p style="margin:0 0 8px;font-size:13px;color:#666;">Si el botón no funciona, copia este enlace en tu navegador:</p>
          <p style="margin:0 0 24px;font-size:13px;word-break:break-all;"><a href="${link}" style="color:#ff660d;">${link}</a></p>
          <p style="margin:0;font-size:12px;color:#999;">Si no has creado esta cuenta, puedes ignorar este email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    };
}
