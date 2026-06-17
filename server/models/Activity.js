const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'El título es obligatorio'],
      trim: true,
      maxlength: 200,
    },
    type: {
      type: String,
      enum: ['fonema', 'silaba', 'palabra', 'comprension', 'otro'],
      required: [true, 'El tipo es obligatorio'],
    },
    therapeuticGoal: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    difficultyLevel: {
      type: Number,
      enum: [1, 2, 3],
      required: [true, 'El nivel de dificultad es obligatorio'],
    },
    ageRange: {
      type: new mongoose.Schema(
        {
          min: { type: Number, default: null },
          max: { type: Number, default: null },
        },
        { _id: false }
      ),
      default: () => ({ min: null, max: null }),
    },
    durationMinutes: {
      type: Number,
      min: 1,
      max: 120,
      default: null,
    },
    availableToTutors: {
      type: Boolean,
      default: false,
    },
    thumbnailUrl: {
      type: String,
      default: null,
    },
    bundleUrl: {
      type: String,
      default: null,
    },
    // ── Campos de bundle subido (publicación 2.D). Opcionales: las actividades
    // creadas manualmente (sin ZIP) o legacy no los tienen. ──────────────────
    gameId: {
      type: String,
      default: null,
    },
    gameVersion: {
      type: String,
      default: null,
    },
    entryPoint: {
      type: String,
      default: null,
    },
    bundlePath: {
      type: String,
      default: null,
    },
    manifest: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Umbral mínimo de scorePercent para considerar la actividad como superada (Capa 1 educativa).
    // Lo fija el Admin al subir la actividad. Sin override de tutor en MVP (plan §8.6 v0.6).
    // No es scoring clínico ni SaMD: es un parámetro educativo de aprobación.
    passThreshold: {
      type: Number,
      min: 0,
      max: 100,
      default: 60,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El creador es obligatorio'],
    },
  },
  { timestamps: true }
);

activitySchema.index({ type: 1 });
activitySchema.index({ difficultyLevel: 1 });
activitySchema.index({ availableToTutors: 1 });

const Activity = mongoose.model('Activity', activitySchema);
module.exports = Activity;
