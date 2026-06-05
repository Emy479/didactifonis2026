const mongoose = require('mongoose');

// Capa 1 educativa — NO clínica. Sin datos de salud ni scoring clínico.
// scorePercent/passed son derivados server-side; rawScore/maxScore son informativos del juego (entrada no confiable).
const activityResultSchema = new mongoose.Schema(
  {
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
    schemaVersion: {
      type: String,
      default: '1.0',
    },
    // Capa 1 educativa. rawScore/maxScore son informativos del juego (entrada no confiable, sin transformar).
    rawScore: {
      type: Number,
      min: 0,
      default: null,
    },
    // Capa 1 educativa. Máximo de la escala interna del juego (entrada no confiable, sin transformar).
    maxScore: {
      type: Number,
      min: 0,
      default: null,
    },
    // Capa 1 educativa. scorePercent/passed son derivados server-side; rawScore/maxScore son informativos del juego (entrada no confiable).
    // Derivación real implementada en E1.
    scorePercent: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    // passed: Capa 1 educativa. Derivado server-side en E1 usando passThreshold de la actividad.
    passed: {
      type: Boolean,
      default: null,
    },
    attemptCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    durationSeconds: {
      type: Number,
      min: 0,
      default: null,
    },
    // Capa 1 educativa — traza de telemetría; almacenada tal cual; no se deriva métrica de ella (frontera SaMD).
    events: {
      type: [
        {
          type: { type: String, required: true },
          timestamp: { type: Date, required: true },
          payload: { type: mongoose.Schema.Types.Mixed, default: {} },
        },
      ],
      default: [],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

activityResultSchema.index({ childId: 1 });
activityResultSchema.index({ assignmentId: 1 });

const ActivityResult = mongoose.model('ActivityResult', activityResultSchema);
module.exports = ActivityResult;
