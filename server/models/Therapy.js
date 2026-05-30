const mongoose = require('mongoose');

// Modelo de terapia — creada por un profesional para un paciente (niño).
// Capa 1 educativa: contiene objetivos y métricas de avance.
// La Capa 2 clínica (notas, observaciones) se reserva para versión posterior.
const therapySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre de la terapia es obligatorio'],
      trim: true,
      maxlength: 200,
    },
    professionalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El profesional es obligatorio'],
    },
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Child',
      required: [true, 'El paciente (niño) es obligatorio'],
    },
    therapeuticGoal: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'review'],
      default: 'active',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    sessions: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El creador es obligatorio'],
    },
  },
  { timestamps: true }
);

therapySchema.index({ professionalId: 1 });
therapySchema.index({ childId: 1 });
therapySchema.index({ status: 1 });

const Therapy = mongoose.model('Therapy', therapySchema);
module.exports = Therapy;
