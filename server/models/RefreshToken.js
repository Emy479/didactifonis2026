/**
 * RefreshToken.js
 *
 * Modelo B3: sesión de refresh token con revocación y detección de reuso.
 *
 * El token PLANO nunca se almacena. Solo se guarda su SHA-256 (tokenHash).
 * Si la colección se filtra, los tokens no son utilizables.
 *
 * El campo familyId agrupa todos los refresh tokens derivados de un mismo
 * login (cadena de rotaciones). Si se detecta reuso de un token ya rotado
 * (revoked=true), se revoca TODA la familia (reuse-detection OWASP).
 *
 * TTL index sobre expiresAt: MongoDB purga automáticamente los documentos
 * expirados. Los revocados se mantienen hasta su expiresAt para detectar
 * reuso dentro de la ventana de vida original.
 *
 * ip y userAgent son datos personales almacenados con finalidad de seguridad
 * (detección de acceso anómalo). Se purgan con el TTL del documento.
 * Ver docs/marco-legal.md y ADR docs/adr-jwt-refresh-b3.md §2.7.
 */

const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // SHA-256 hex del secreto aleatorio. Permite lookup directo sin bcrypt.
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // UUID que agrupa la cadena de rotaciones del mismo login.
    // Permite revocar toda la familia en detección de reuso.
    familyId: {
      type: String,
      required: true,
    },
    // TTL index: MongoDB expira y elimina el documento en este instante.
    // expireAfterSeconds:0 → Mongo usa el valor del campo como fecha exacta.
    expiresAt: {
      type: Date,
      required: true,
    },
    revoked: {
      type: Boolean,
      default: false,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    // Hash del refresh token sucesor (emitido al rotar). Null si es el vigente.
    replacedBy: {
      type: String,
      default: null,
    },
    // Datos de sesión para auditoría y futura lista de dispositivos (D2 DIFERIDO).
    userAgent: {
      type: String,
      default: null,
    },
    ip: {
      type: String,
      default: null,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt automáticos
  }
);

// TTL index: Mongo borra el documento cuando Date.now() >= expiresAt.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
module.exports = RefreshToken;
