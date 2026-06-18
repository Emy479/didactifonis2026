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

// ── Helper: parsear y validar parámetros de paginación ──────────────────────
// Exportado para tests unitarios puros (sin DB).
// Decisión sobre `before` inválido: se ignora (null) y se devuelve la página
// más reciente. Esto es más robusto para clientes con datos desincronizados.
function parseMessagesPagination(query) {
  const DEFAULT_LIMIT = 50;
  const MIN_LIMIT = 1;
  const MAX_LIMIT = 100;

  // Parsear limit: si falta o no es entero positivo válido → default.
  let limit = DEFAULT_LIMIT;
  if (query.limit !== undefined) {
    const parsed = parseInt(query.limit, 10);
    if (!isNaN(parsed) && parsed >= MIN_LIMIT) {
      limit = Math.min(parsed, MAX_LIMIT);
    }
    // Si parsed < MIN_LIMIT o NaN → queda DEFAULT_LIMIT (se ignora el valor inválido).
    // Clamp a MIN_LIMIT se aplica también: valores < 1 quedan en DEFAULT.
    if (!isNaN(parsed) && parsed < MIN_LIMIT) {
      limit = MIN_LIMIT;
    }
  }

  // Parsear before: timestamp ISO o nulo.
  // Decisión: before inválido → null (se ignora, devuelve página más reciente).
  let before = null;
  if (query.before !== undefined && query.before !== '') {
    const d = new Date(query.before);
    if (!isNaN(d.getTime())) {
      before = d;
    }
    // before inválido: null (ignorar silenciosamente).
  }

  return { limit, before };
}

// ── GET /api/messages/:invitationId ─────────────────────────────────────────
// Devuelve los N mensajes más recientes del hilo en orden ascendente (compatible
// con el frontend actual que espera un array).
// Query params:
//   limit  - entero [1, 100], default 50.
//   before - timestamp ISO; si viene, trae mensajes con createdAt < before
//            (útil para "cargar más antiguos"). Si es inválido, se ignora.
// El marcado de leídos se aplica sobre TODO el hilo (no solo la página) para
// que el badge del /conversations quede limpio aunque la página sea parcial.
router.get('/:invitationId', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const invitation = await verificarAccesoMensaje(req.params.invitationId, userId);

    if (!invitation) {
      return res.status(403).json({ message: 'Sin acceso a este hilo de mensajería' });
    }

    const { limit, before } = parseMessagesPagination(req.query);

    // Construir filtro base.
    const filtro = { invitationId: invitation._id };
    if (before) {
      filtro.createdAt = { $lt: before };
    }

    // Obtener los N más recientes (desc) y luego invertir a ascendente para el render.
    const mensajes = await Message.find(filtro)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('senderId', 'name')
      .populate('receiverId', 'name')
      .lean();

    mensajes.reverse(); // ascendente para el frontend.

    // Marcar como leídos TODOS los mensajes no leídos del hilo dirigidos al usuario,
    // no solo los de la página. Así el badge del /conversations siempre queda limpio.
    const ahora = new Date();
    await Message.updateMany(
      { invitationId: invitation._id, receiverId: userId, readAt: null },
      { $set: { readAt: ahora } }
    );

    // Reflejar el readAt en los mensajes de la página que correspondan.
    mensajes.forEach((m) => {
      if (m.receiverId._id.toString() === userId.toString() && !m.readAt) {
        m.readAt = ahora;
      }
    });

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
module.exports.parseMessagesPagination = parseMessagesPagination;
