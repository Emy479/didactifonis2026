const { Router } = require('express');
const Invitation = require('../models/Invitation');
const Message = require('../models/Message');
const { protect, requireActiveSubscription } = require('../middleware/auth');

const router = Router();

// Todos los endpoints requieren autenticación y suscripción activa.
// No se restringe por rol aquí porque tanto tutores como profesionales usan mensajes.
router.use(protect, requireActiveSubscription);

// ── Helper: verificar acceso al hilo de mensajería ───────────────────────────
// El usuario debe ser el profesional o el tutor del vínculo, y el vínculo debe
// estar aceptado. Devuelve la Invitation si el acceso es válido, o null si no.
async function verificarAccesoMensaje(invitationId, userId) {
  const invitation = await Invitation.findById(invitationId);
  if (!invitation || invitation.status !== 'accepted') return null;

  const esProfesional = invitation.professionalId.toString() === userId.toString();
  const esTutor = invitation.tutorId.toString() === userId.toString();

  if (!esProfesional && !esTutor) return null;
  return invitation;
}

// ── GET /api/messages/conversations ─────────────────────────────────────────
// IMPORTANTE: esta ruta debe ir ANTES de /:invitationId para evitar que Express
// interprete "conversations" como un ID de MongoDB.
// Lista los hilos de mensajería activos del usuario autenticado.
router.get('/conversations', async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Buscar todos los vínculos aceptados donde el usuario participa.
    const vinculos = await Invitation.find({
      status: 'accepted',
      $or: [{ professionalId: userId }, { tutorId: userId }],
    })
      .populate('professionalId', 'name')
      .populate('tutorId', 'name')
      .populate('childId', 'name avatarId')
      .lean();

    // Para cada vínculo, obtener el último mensaje y el conteo de no leídos.
    const conversaciones = await Promise.all(
      vinculos.map(async (vinculo) => {
        const [ultimoMensaje, noLeidos] = await Promise.all([
          Message.findOne({ invitationId: vinculo._id })
            .sort({ createdAt: -1 })
            .lean(),
          Message.countDocuments({
            invitationId: vinculo._id,
            receiverId: userId,
            readAt: null,
          }),
        ]);

        return {
          invitation: vinculo,
          ultimoMensaje,
          noLeidos,
        };
      })
    );

    return res.json(conversaciones);
  } catch (err) {
    return next(err);
  }
});

// ── GET /api/messages/:invitationId ─────────────────────────────────────────
// Devuelve los mensajes de un hilo ordenados por fecha ascendente.
// Marca como leídos los mensajes donde el usuario es el destinatario.
router.get('/:invitationId', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const invitation = await verificarAccesoMensaje(req.params.invitationId, userId);

    if (!invitation) {
      return res.status(403).json({ message: 'Sin acceso a este hilo de mensajería' });
    }

    // Obtener mensajes ordenados por fecha.
    const mensajes = await Message.find({ invitationId: invitation._id })
      .sort({ createdAt: 1 })
      .populate('senderId', 'name')
      .populate('receiverId', 'name')
      .lean();

    // Marcar como leídos los mensajes dirigidos al usuario que aún no tienen readAt.
    const ahora = new Date();
    const idsNoLeidos = mensajes
      .filter((m) => m.receiverId._id.toString() === userId.toString() && !m.readAt)
      .map((m) => m._id);

    if (idsNoLeidos.length > 0) {
      await Message.updateMany(
        { _id: { $in: idsNoLeidos } },
        { $set: { readAt: ahora } }
      );
      // Actualizar en memoria para reflejar el readAt en la respuesta.
      mensajes.forEach((m) => {
        if (idsNoLeidos.some((id) => id.toString() === m._id.toString())) {
          m.readAt = ahora;
        }
      });
    }

    return res.json(mensajes);
  } catch (err) {
    return next(err);
  }
});

// ── POST /api/messages ───────────────────────────────────────────────────────
// Crea un nuevo mensaje en el hilo indicado.
router.post('/', async (req, res, next) => {
  try {
    const { invitationId, content } = req.body;
    const userId = req.user._id;

    if (!invitationId) {
      return res.status(400).json({ message: 'invitationId es obligatorio' });
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ message: 'content es obligatorio y no puede estar vacío' });
    }
    if (content.length > 2000) {
      return res.status(400).json({ message: 'El mensaje no puede superar los 2000 caracteres' });
    }

    const invitation = await verificarAccesoMensaje(invitationId, userId);
    if (!invitation) {
      return res.status(403).json({ message: 'Sin acceso a este hilo de mensajería' });
    }

    // Determinar el destinatario: si el que envía es el profesional, el destino
    // es el tutor, y viceversa.
    const esProfesional = invitation.professionalId.toString() === userId.toString();
    const receiverId = esProfesional ? invitation.tutorId : invitation.professionalId;

    const mensaje = await Message.create({
      invitationId: invitation._id,
      senderId: userId,
      receiverId,
      content: content.trim(),
    });

    return res.status(201).json(mensaje);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
