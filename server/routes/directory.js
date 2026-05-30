const { Router } = require('express');
const User = require('../models/User');
const Child = require('../models/Child');
const Invitation = require('../models/Invitation');
const { protect, requireRole, requireActiveSubscription } = require('../middleware/auth');

const router = Router();

// Todos los endpoints requieren autenticación y suscripción activa.
router.use(protect, requireActiveSubscription);

// ── Utilidad: verificar si un usuario tiene suscripción vigente ───────────────
function tieneAccesoActivo(user) {
  const { status, trialEndsAt, planExpiresAt } = user.subscription || {};
  const now = new Date();
  if (status === 'active') {
    return !planExpiresAt || planExpiresAt > now;
  }
  if (status === 'trial') {
    return trialEndsAt != null && trialEndsAt > now;
  }
  return false;
}

// ── GET /api/professionals/directory ────────────────────────────────────────
// Rol: tutor. Listado público de profesionales activos con suscripción vigente.
// No expone: password, consent, detalles de suscripción.
router.get('/directory', requireRole('tutor'), async (req, res, next) => {
  try {
    const now = new Date();

    // Traer solo profesionales activos con suscripción trial o active.
    const profesionales = await User.find({
      role: 'profesional',
      isActive: true,
      $or: [
        // trial vigente
        { 'subscription.status': 'trial', 'subscription.trialEndsAt': { $gt: now } },
        // active sin fecha de expiración
        { 'subscription.status': 'active', 'subscription.planExpiresAt': null },
        // active con fecha de expiración futura
        { 'subscription.status': 'active', 'subscription.planExpiresAt': { $gt: now } },
      ],
    })
      .select('name email professionalProfile')
      .lean();

    return res.json(profesionales);
  } catch (err) {
    return next(err);
  }
});

// ── POST /api/professionals/request ─────────────────────────────────────────
// Rol: tutor. Solicita vinculación con un profesional para un niño específico.
router.post('/request', requireRole('tutor'), async (req, res, next) => {
  try {
    const { professionalId, childId } = req.body;

    if (!professionalId || !childId) {
      return res.status(400).json({ message: 'professionalId y childId son obligatorios' });
    }

    // Verificar que el niño pertenece al tutor autenticado.
    const child = await Child.findById(childId);
    if (!child || !child.isActive) {
      return res.status(404).json({ message: 'Niño no encontrado o inactivo' });
    }
    if (child.tutorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Este niño no pertenece al tutor autenticado' });
    }

    // Verificar que el profesional existe, está activo y tiene suscripción vigente.
    const profesional = await User.findById(professionalId);
    if (!profesional || profesional.role !== 'profesional' || !profesional.isActive) {
      return res.status(404).json({ message: 'Profesional no encontrado o inactivo' });
    }
    if (!tieneAccesoActivo(profesional)) {
      return res.status(422).json({ message: 'El profesional no tiene una suscripción vigente' });
    }

    // Verificar que no exista una invitación pending o accepted entre ellos.
    const existente = await Invitation.findOne({
      professionalId,
      childId: child._id,
      status: { $in: ['pending', 'accepted'] },
    });
    if (existente) {
      return res.status(409).json({
        message: 'Ya existe una solicitud activa para este niño con este profesional',
      });
    }

    const invitation = await Invitation.create({
      professionalId,
      childId: child._id,
      tutorId: req.user._id,
      direction: 'tutor_to_pro',
      status: 'pending',
    });

    return res.status(201).json(invitation);
  } catch (err) {
    return next(err);
  }
});

// ── GET /api/professionals/incoming ─────────────────────────────────────────
// Rol: profesional. Lista solicitudes tutor_to_pro pendientes dirigidas a él.
router.get('/incoming', requireRole('profesional'), async (req, res, next) => {
  try {
    const solicitudes = await Invitation.find({
      professionalId: req.user._id,
      direction: 'tutor_to_pro',
      status: 'pending',
    })
      .populate('tutorId', 'name email')
      .populate('childId', 'name avatarId')
      .lean();

    return res.json(solicitudes);
  } catch (err) {
    return next(err);
  }
});

// ── POST /api/professionals/respond ─────────────────────────────────────────
// Rol: profesional. Acepta o rechaza una solicitud tutor_to_pro.
router.post('/respond', requireRole('profesional'), async (req, res, next) => {
  try {
    const { invitationId, decision } = req.body;

    if (!invitationId || !decision) {
      return res.status(400).json({ message: 'invitationId y decision son obligatorios' });
    }
    if (!['accepted', 'rejected'].includes(decision)) {
      return res.status(400).json({ message: "decision debe ser 'accepted' o 'rejected'" });
    }

    const invitation = await Invitation.findById(invitationId);

    if (!invitation) {
      return res.status(404).json({ message: 'Invitación no encontrada' });
    }
    if (invitation.direction !== 'tutor_to_pro') {
      return res.status(400).json({ message: 'Esta invitación no es del tipo tutor_to_pro' });
    }
    if (invitation.professionalId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Sin permiso para esta invitación' });
    }
    if (invitation.status !== 'pending') {
      return res.status(409).json({
        message: `La invitación no está pendiente (estado actual: ${invitation.status})`,
      });
    }

    if (decision === 'accepted') {
      // Registrar consentimiento del profesional (sin IP; solo fecha y versión fija).
      invitation.consentRecord = {
        acceptedAt: new Date(),
        ip: null,
        version: 'v1.0',
      };
      invitation.status = 'accepted';
      await invitation.save();

      // Agregar al profesional en accessGrants del niño (idempotente).
      await Child.updateOne(
        { _id: invitation.childId },
        { $addToSet: { accessGrants: invitation.professionalId } }
      );
    } else {
      invitation.status = 'rejected';
      await invitation.save();
    }

    return res.json(invitation);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
