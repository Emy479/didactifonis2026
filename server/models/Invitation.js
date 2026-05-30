const mongoose = require('mongoose');
const crypto = require('crypto');

// ── Subdocumento: registro de consentimiento ─────────────────────────────────
const consentRecordSchema = new mongoose.Schema(
  {
    acceptedAt: { type: Date, default: null },
    ip: { type: String, default: null },
    version: { type: String, default: null },
  },
  { _id: false }
);

// ── Modelo de invitación de vinculación profesional ↔ tutor ─────────────────
const invitationSchema = new mongoose.Schema(
  {
    professionalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El profesional es obligatorio'],
    },
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Child',
      required: [true, 'El niño es obligatorio'],
    },
    tutorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El tutor es obligatorio'],
    },
    token: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(32).toString('hex'),
    },
    // pro_to_tutor: el profesional genera un código para que el tutor acepte.
    // tutor_to_pro: el tutor solicita al profesional desde el directorio.
    direction: {
      type: String,
      enum: ['pro_to_tutor', 'tutor_to_pro'],
      default: 'pro_to_tutor',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'expired', 'revoked'],
      default: 'pending',
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
    // Registro de consentimiento: quién aceptó, cuándo, desde qué IP y qué versión.
    consentRecord: {
      type: consentRecordSchema,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: false },
  }
);

// ── Índices ──────────────────────────────────────────────────────────────────
invitationSchema.index({ token: 1 }, { unique: true });
invitationSchema.index({ professionalId: 1 });
invitationSchema.index({ childId: 1 });
invitationSchema.index({ tutorId: 1 });
invitationSchema.index({ status: 1 });

const Invitation = mongoose.model('Invitation', invitationSchema);
module.exports = Invitation;
