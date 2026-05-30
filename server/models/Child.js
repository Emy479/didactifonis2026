const mongoose = require('mongoose');

// ── Modelo de niño/niña ──────────────────────────────────────────────────────
const childSchema = new mongoose.Schema(
  {
    tutorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El tutor es obligatorio'],
    },
    name: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      maxlength: 100,
    },
    birthDate: {
      type: Date,
      default: null,
    },
    avatarId: {
      type: String,
      default: 'nino-1',
      enum: ['nino-1', 'nino-2', 'nina-1', 'nina-2'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Array de profesionales con acceso autorizado (vacío por ahora)
    accessGrants: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: false },
  }
);

// ── Índice para búsquedas por tutor ──────────────────────────────────────────
childSchema.index({ tutorId: 1 });

const Child = mongoose.model('Child', childSchema);
module.exports = Child;
