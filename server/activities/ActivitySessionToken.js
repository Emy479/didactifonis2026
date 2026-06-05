const mongoose = require('mongoose');

/**
 * ActivitySessionToken — token de sesión de un solo uso para el arranque de una actividad.
 *
 * TTL: 30 minutos desde la emisión. Cubre el runtime.maxDurationSeconds (900 s = 15 min)
 * más un margen de seguridad de 15 min para latencias de arranque. El índice TTL de MongoDB
 * elimina el documento automáticamente al vencer expiresAt, manteniendo la colección limpia
 * sin tareas de limpieza programadas.
 *
 * ADR-SDK-02, D4.
 */
const activitySessionTokenSchema = new mongoose.Schema(
  {
    // UUID v4 generado con crypto.randomUUID() — identificador opaco único del token.
    token: {
      type: String,
      required: [true, 'El token es obligatorio'],
      unique: true,
    },

    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: [true, 'El assignment es obligatorio'],
    },

    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Child',
      required: [true, 'El niño es obligatorio'],
    },

    activityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity',
      required: [true, 'La actividad es obligatoria'],
    },

    // Estado del ciclo de vida del token.
    // 'unused' → emitido, listo para usar.
    // 'used'   → consumido por un POST /api/activities/results; no acepta reingesta.
    status: {
      type: String,
      enum: ['unused', 'used'],
      default: 'unused',
    },

    usedAt: {
      type: Date,
      default: null,
    },

    // Fecha de expiración. El índice TTL (expireAfterSeconds: 0) elimina el documento
    // automáticamente cuando expiresAt <= ahora. Valor elegido: 30 min (1800 segundos).
    // Documentado como SESSION_TOKEN_TTL_SECONDS en este archivo para referencia.
    expiresAt: {
      type: Date,
      required: [true, 'La fecha de expiración es obligatoria'],
    },
  },
  { timestamps: true }
);

/**
 * TTL del token de sesión: 30 minutos.
 * Cubre maxDurationSeconds (900 s) + 15 min de margen para latencias de arranque.
 * MongoDB elimina el documento cuando Date.now() >= expiresAt.
 */
const SESSION_TOKEN_TTL_SECONDS = 30 * 60; // 1800 s

// Índice TTL: MongoDB borra el documento automáticamente cuando expiresAt vence.
// expireAfterSeconds: 0 significa "borrar cuando el campo expiresAt llegue al pasado".
activitySessionTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ActivitySessionToken = mongoose.model('ActivitySessionToken', activitySessionTokenSchema);

module.exports = { ActivitySessionToken, SESSION_TOKEN_TTL_SECONDS };
