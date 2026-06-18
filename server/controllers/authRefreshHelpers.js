/**
 * authRefreshHelpers.js
 *
 * Funciones puras extraídas del controlador de autenticación B3.
 * Sin dependencias de BD ni Express. Testeable de forma aislada.
 */

const crypto = require('crypto');

// ── parseMs ──────────────────────────────────────────────────────────────────
// Convierte un string de TTL ('15m', '14d', '3600s', '2h') a milisegundos.
// Unidades soportadas: s (segundos), m (minutos), h (horas), d (días).
// Lanza Error si el formato no es válido.
function parseMs(ttlStr) {
  const match = /^(\d+)(s|m|h|d)$/.exec(ttlStr);
  if (!match) throw new Error(`TTL inválido: "${ttlStr}"`);
  const n = parseInt(match[1], 10);
  const unit = match[2];
  const factors = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return n * factors[unit];
}

// ── hashToken ─────────────────────────────────────────────────────────────────
// Calcula el SHA-256 hex de un secreto de refresh token.
// Es el mismo hash que se almacena en BD y se usa para buscar el documento.
function hashToken(secret) {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

// ── generateSecret ────────────────────────────────────────────────────────────
// Genera un secreto aleatorio de alta entropía (256 bits = 32 bytes en hex).
function generateSecret() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = { parseMs, hashToken, generateSecret };
