/**
 * contact.js — POST /api/contact
 * Endpoint público (sin auth). Valida un formulario de contacto y envía un
 * correo transaccional vía la API REST de Resend (fetch nativo de Node, sin SDK).
 *
 * Justificación de fetch vs SDK:
 *   Se trata de una sola llamada HTTP con un contrato REST estable y simple.
 *   Usar fetch global evita añadir la dependencia `resend` a package.json.
 *
 * Modo log en desarrollo (NODE_ENV !== 'production'):
 *   Si falta alguna de las variables RESEND_API_KEY / RESEND_FROM / CONTACT_TO,
 *   el endpoint NO realiza la llamada a Resend. En su lugar imprime en consola el
 *   correo que habría enviado y responde 200 { ok: true }. Esto permite que el
 *   formulario funcione localmente sin configurar Resend.
 *   En producción, la config faltante produce 502 inmediatamente.
 */

const { Router } = require('express');
const { validateContactFields, isHoneypotTriggered, MOTIVO_LABELS } = require('./contactValidation');

const router = Router();

// ── Escapa HTML básico para no inyectar tags en el cuerpo del correo ────────
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Construye el subject del correo ─────────────────────────────────────────
function buildSubject(motivo, nombre) {
  const label = MOTIVO_LABELS[motivo] || motivo;
  return `[Contacto landing] ${label} — ${nombre}`;
}

// ── Construye los cuerpos text y html del correo ─────────────────────────────
function buildEmailBody({ nombre, email, motivo, mensaje }) {
  const label = MOTIVO_LABELS[motivo] || motivo;

  const text = [
    `Nuevo mensaje desde el formulario de contacto de Didactifonis.`,
    ``,
    `Nombre:  ${nombre}`,
    `Email:   ${email}`,
    `Motivo:  ${label}`,
    ``,
    `Mensaje:`,
    mensaje,
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Contacto Didactifonis</title></head>
<body style="font-family:sans-serif;color:#1a1a2e;max-width:600px;margin:auto;padding:24px">
  <h2 style="margin-bottom:4px">Nuevo mensaje de contacto</h2>
  <p style="color:#555;font-size:13px;margin-top:0">Formulario de la landing — Didactifonis</p>
  <table style="border-collapse:collapse;width:100%;margin-top:16px">
    <tr>
      <td style="padding:8px 12px;background:#f5f5f5;font-weight:600;width:120px;border:1px solid #ddd">Nombre</td>
      <td style="padding:8px 12px;border:1px solid #ddd">${escapeHtml(nombre)}</td>
    </tr>
    <tr>
      <td style="padding:8px 12px;background:#f5f5f5;font-weight:600;border:1px solid #ddd">Email</td>
      <td style="padding:8px 12px;border:1px solid #ddd">${escapeHtml(email)}</td>
    </tr>
    <tr>
      <td style="padding:8px 12px;background:#f5f5f5;font-weight:600;border:1px solid #ddd">Motivo</td>
      <td style="padding:8px 12px;border:1px solid #ddd">${escapeHtml(label)}</td>
    </tr>
  </table>
  <h3 style="margin-top:24px;margin-bottom:8px">Mensaje</h3>
  <div style="background:#f9f9f9;border:1px solid #ddd;padding:16px;white-space:pre-wrap">${escapeHtml(mensaje)}</div>
  <p style="font-size:11px;color:#888;margin-top:24px">
    Para responder, usa el botón "Responder" de tu cliente de correo — va directo al remitente.
  </p>
</body>
</html>`;

  return { text, html };
}

// ── Handler principal ────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  // Honeypot: si el campo oculto `website` viene con contenido, es un bot.
  // Respondemos 200 sin enviar para no dar pistas.
  if (isHoneypotTriggered(req.body)) {
    return res.status(200).json({ ok: true });
  }

  // Validación de campos
  const validation = validateContactFields(req.body);
  if (!validation.ok) {
    return res.status(400).json({ message: validation.message });
  }

  const { nombre, email, motivo, mensaje } = validation.value;

  // Variables de entorno necesarias
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM;
  const toAddress = process.env.CONTACT_TO;
  const isProd = process.env.NODE_ENV === 'production';

  const configComplete = apiKey && fromAddress && toAddress;

  // Modo log en desarrollo: config faltante no bloquea el flujo local
  if (!configComplete) {
    if (isProd) {
      // En producción la config faltante es un error de despliegue
      console.error(
        '[CONFIG] RESEND_API_KEY / RESEND_FROM / CONTACT_TO no están configuradas. ' +
        'El correo de contacto NO se envió. Revisa las variables de entorno.'
        // Nunca imprimir el valor de RESEND_API_KEY aquí
      );
      return res.status(502).json({ message: 'No se pudo enviar el mensaje. Intenta más tarde.' });
    }

    // Modo log (desarrollo): simula el envío sin llamar a Resend
    const subject = buildSubject(motivo, nombre);
    const { text } = buildEmailBody({ nombre, email, motivo, mensaje });
    console.log(
      '[contact/dev-log] Variables Resend no configuradas — modo log activo.\n' +
      `  Para: <CONTACT_TO no definido>\n` +
      `  De:   <RESEND_FROM no definido>\n` +
      `  Asunto: ${subject}\n` +
      `  reply_to: ${email}\n` +
      `---\n${text}\n---`
    );
    return res.status(200).json({ ok: true });
  }

  // Envío real vía Resend REST API
  const subject = buildSubject(motivo, nombre);
  const { text, html } = buildEmailBody({ nombre, email, motivo, mensaje });

  let resendResponse;
  try {
    resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // RESEND_API_KEY es un secreto: nunca se loguea, solo se usa aquí
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromAddress,
        to: toAddress,
        reply_to: email,
        subject,
        text,
        html,
      }),
    });
  } catch (networkErr) {
    // Error de red (DNS, timeout, etc.)
    console.error('[contact] Error de red al contactar Resend:', networkErr.message);
    return res.status(502).json({ message: 'No se pudo enviar el mensaje. Intenta más tarde.' });
  }

  if (!resendResponse.ok) {
    // Status no-2xx de Resend: loguea el status code (no el cuerpo completo ni la key)
    console.error(
      `[contact] Resend devolvió status ${resendResponse.status}. ` +
      'Verifica RESEND_API_KEY, RESEND_FROM y que el dominio esté verificado en Resend.'
    );
    return res.status(502).json({ message: 'No se pudo enviar el mensaje. Intenta más tarde.' });
  }

  return res.status(200).json({ ok: true });
});

module.exports = router;
