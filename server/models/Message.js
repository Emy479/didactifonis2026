const mongoose = require('mongoose');

// ── Modelo de mensaje dentro de un hilo de vinculación ───────────────────────
// Los mensajes solo existen en el contexto de una Invitation con status='accepted'.
const messageSchema = new mongoose.Schema(
  {
    invitationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invitation',
      required: [true, 'La invitación es obligatoria'],
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El remitente es obligatorio'],
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El destinatario es obligatorio'],
    },
    content: {
      type: String,
      required: [true, 'El contenido es obligatorio'],
      maxlength: [2000, 'El mensaje no puede superar los 2000 caracteres'],
    },
    // null = no leído; Date = cuándo se leyó por primera vez.
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: false },
  }
);

// ── Índices ──────────────────────────────────────────────────────────────────
// Consulta habitual: todos los mensajes de una conversación ordenados por fecha.
messageSchema.index({ invitationId: 1, createdAt: 1 });
// Consulta de mensajes no leídos para un destinatario.
messageSchema.index({ receiverId: 1, readAt: 1 });

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
