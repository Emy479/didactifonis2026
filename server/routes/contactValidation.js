/**
 * contactValidation.js
 * Helper puro de validación para POST /api/contact.
 * Sin dependencias de Express ni DB: testeable con node:test sin infraestructura.
 *
 * validateContactFields(body)
 *   Retorna { ok: true, value } o { ok: false, message }.
 *   `value` contiene { nombre, email, motivo, mensaje } normalizados (trim aplicado).
 *   El campo honeypot `website` se evalúa aparte con isHoneypotTriggered().
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MOTIVOS_VALIDOS = ['saber-mas', 'fonoaudiologo', 'problema-tecnico', 'otro'];

/**
 * Etiqueta legible para cada valor de motivo (usada en el subject del correo).
 * @type {Record<string, string>}
 */
const MOTIVO_LABELS = {
  'saber-mas': 'Quiero saber más',
  'fonoaudiologo': 'Soy fonoaudiólogo',
  'problema-tecnico': 'Problema técnico',
  'otro': 'Otro',
};

/**
 * @param {unknown} body
 * @returns {{ ok: true, value: { nombre: string, email: string, motivo: string, mensaje: string } }
 *          | { ok: false, message: string }}
 */
function validateContactFields(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, message: 'El cuerpo de la solicitud no es válido.' };
  }

  // ── nombre ─────────────────────────────────────────────────────────────────
  const nombreRaw = body.nombre;
  if (nombreRaw === undefined || nombreRaw === null) {
    return { ok: false, message: 'El campo nombre es obligatorio.' };
  }
  if (typeof nombreRaw !== 'string') {
    return { ok: false, message: 'El nombre debe ser texto.' };
  }
  const nombre = nombreRaw.trim();
  if (nombre.length === 0) {
    return { ok: false, message: 'El nombre no puede estar vacío.' };
  }
  if (nombre.length > 120) {
    return { ok: false, message: 'El nombre no puede superar 120 caracteres.' };
  }

  // ── email ──────────────────────────────────────────────────────────────────
  const emailRaw = body.email;
  if (emailRaw === undefined || emailRaw === null) {
    return { ok: false, message: 'El campo email es obligatorio.' };
  }
  if (typeof emailRaw !== 'string') {
    return { ok: false, message: 'El email debe ser texto.' };
  }
  const email = emailRaw.trim();
  if (email.length === 0) {
    return { ok: false, message: 'El email no puede estar vacío.' };
  }
  if (email.length > 160) {
    return { ok: false, message: 'El email no puede superar 160 caracteres.' };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { ok: false, message: 'El email no tiene un formato válido.' };
  }

  // ── motivo ─────────────────────────────────────────────────────────────────
  const motivo = body.motivo;
  if (motivo === undefined || motivo === null) {
    return { ok: false, message: 'El campo motivo es obligatorio.' };
  }
  if (!MOTIVOS_VALIDOS.includes(motivo)) {
    return {
      ok: false,
      message: `El motivo debe ser uno de: ${MOTIVOS_VALIDOS.join(', ')}.`,
    };
  }

  // ── mensaje ────────────────────────────────────────────────────────────────
  const mensajeRaw = body.mensaje;
  if (mensajeRaw === undefined || mensajeRaw === null) {
    return { ok: false, message: 'El campo mensaje es obligatorio.' };
  }
  if (typeof mensajeRaw !== 'string') {
    return { ok: false, message: 'El mensaje debe ser texto.' };
  }
  const mensaje = mensajeRaw.trim();
  if (mensaje.length === 0) {
    return { ok: false, message: 'El mensaje no puede estar vacío.' };
  }
  if (mensaje.length > 2000) {
    return { ok: false, message: 'El mensaje no puede superar 2000 caracteres.' };
  }

  return {
    ok: true,
    value: { nombre, email, motivo, mensaje },
  };
}

/**
 * Devuelve true si el campo honeypot `website` llegó con contenido.
 * En ese caso el router debe responder 200 { ok: true } sin enviar nada.
 * @param {unknown} body
 * @returns {boolean}
 */
function isHoneypotTriggered(body) {
  if (!body || typeof body !== 'object') return false;
  const w = body.website;
  return typeof w === 'string' && w.trim().length > 0;
}

module.exports = { validateContactFields, isHoneypotTriggered, MOTIVO_LABELS, MOTIVOS_VALIDOS };
