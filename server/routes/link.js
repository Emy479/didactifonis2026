const { Router } = require('express');
const crypto = require('crypto');
const Invitation = require('../models/Invitation');
const Child = require('../models/Child');
const { protect, requireRole, requireActiveSubscription } = require('../middleware/auth');

const router = Router();

// Todos los endpoints requieren autenticación y suscripción activa.
router.use(protect, requireActiveSubscription);

// ── Utilidad: marcar como expiradas las invitaciones vencidas ────────────────
async function marcarExpiradas(invitations) {
  const now = new Date();
  const aExpirar = invitations.filter(
    (inv) => inv.status === 'pending' && inv.expiresAt < now
  );
  if (aExpirar.length > 0) {
    const ids = aExpirar.map((inv) => inv._id);
    await Invitation.updateMany(
      { _id: { $in: ids }, status: 'pending' },
      { $set: { status: 'expired' } }
    );
    aExpirar.forEach((inv) => { inv.status = 'expired'; });
  }
  return invitations;
}

// ── POST /api/link/invite ────────────────────────────────────────────────────
// Rol: profesional. Genera una invitación pro_to_tutor para un niño activo.
router.post('/invite', requireRole('profesional'), async (req, res, next) => {
  try {
    const { childId } = req.body;

    if (!childId) {
      return res.status(400).json({ message: 'childId es obligatorio' });
    }

    const child = await Child.findById(childId);
    if (!child || !child.isActive) {
      return res.status(404).json({ message: 'Niño no encontrado o inactivo' });
    }

    const proId = req.user._id;
    const tutorId = child.tutorId;

    // Verificar que no exista ya una invitación pending o accepted entre este
    // profesional y este niño.
    const existente = await Invitation.findOne({
      professionalId: proId,
      childId: child._id,
      status: { $in: ['pending', 'accepted'] },
    });
    if (existente) {
      return res.status(409).json({
        message: 'Ya existe una invitación activa para este niño con este profesional',
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const invitation = await Invitation.create({
      professionalId: proId,
      childId: child._id,
      tutorId,
      token,
      direction: 'pro_to_tutor',
      status: 'pending',
      expiresAt,
    });

    return res.status(201).json(invitation);
  } catch (err) {
    return next(err);
  }
});

// ── GET /api/link/invitations ────────────────────────────────────────────────
// Rol: profesional. Lista todas sus invitaciones; marca las expiradas en vuelo.
router.get('/invitations', requireRole('profesional'), async (req, res, next) => {
  try {
    const invitations = await Invitation.find({
      professionalId: req.user._id,
    })
      .populate('childId', 'name avatarId')
      .populate('tutorId', 'name email')
      .lean();

    await marcarExpiradas(invitations);

    return res.json(invitations);
  } catch (err) {
    return next(err);
  }
});

// ── POST /api/link/accept ────────────────────────────────────────────────────
// Rol: tutor. Acepta una invitación pro_to_tutor por token.
router.post('/accept', requireRole('tutor'), async (req, res, next) => {
  try {
    const { token, consentVersion } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'token es obligatorio' });
    }
    if (!consentVersion) {
      return res.status(400).json({ message: 'consentVersion es obligatorio' });
    }

    const invitation = await Invitation.findOne({ token });

    if (!invitation) {
      return res.status(404).json({ message: 'Invitación no encontrada' });
    }
    if (invitation.tutorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Sin permiso para esta invitación' });
    }
    if (invitation.status !== 'pending') {
      return res.status(409).json({
        message: `La invitación no está pendiente (estado actual: ${invitation.status})`,
      });
    }
    if (invitation.expiresAt < new Date()) {
      invitation.status = 'expired';
      await invitation.save();
      return res.status(410).json({ message: 'La invitación ha expirado' });
    }

    // Registrar consentimiento y aceptar.
    invitation.consentRecord = {
      acceptedAt: new Date(),
      ip: req.ip,
      version: consentVersion,
    };
    invitation.status = 'accepted';
    await invitation.save();

    // Agregar el profesional a accessGrants del niño (solo si no está ya).
    await Child.updateOne(
      { _id: invitation.childId },
      { $addToSet: { accessGrants: invitation.professionalId } }
    );

    return res.json(invitation);
  } catch (err) {
    return next(err);
  }
});

// ── POST /api/link/reject ────────────────────────────────────────────────────
// Rol: tutor. Rechaza una invitación pro_to_tutor por token.
router.post('/reject', requireRole('tutor'), async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'token es obligatorio' });
    }

    const invitation = await Invitation.findOne({ token });

    if (!invitation) {
      return res.status(404).json({ message: 'Invitación no encontrada' });
    }
    if (invitation.tutorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Sin permiso para esta invitación' });
    }
    if (invitation.status !== 'pending') {
      return res.status(409).json({
        message: `La invitación no está pendiente (estado actual: ${invitation.status})`,
      });
    }

    invitation.status = 'rejected';
    await invitation.save();

    return res.json({ message: 'Invitación rechazada', invitationId: invitation._id });
  } catch (err) {
    return next(err);
  }
});

// ── DELETE /api/link/:invitationId ───────────────────────────────────────────
// Rol: tutor. Revoca un vínculo aceptado y elimina el acceso del profesional.
router.delete('/:invitationId', requireRole('tutor'), async (req, res, next) => {
  try {
    const invitation = await Invitation.findById(req.params.invitationId);

    if (!invitation) {
      return res.status(404).json({ message: 'Invitación no encontrada' });
    }
    if (invitation.tutorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Sin permiso para esta invitación' });
    }
    if (invitation.status !== 'accepted') {
      return res.status(409).json({
        message: `Solo se puede revocar un vínculo aceptado (estado actual: ${invitation.status})`,
      });
    }

    invitation.status = 'revoked';
    await invitation.save();

    // Eliminar al profesional del array accessGrants del niño.
    await Child.updateOne(
      { _id: invitation.childId },
      { $pull: { accessGrants: invitation.professionalId } }
    );

    return res.json({ message: 'Vínculo revocado correctamente', invitationId: invitation._id });
  } catch (err) {
    return next(err);
  }
});

// ── GET /api/link/my-links ───────────────────────────────────────────────────
// Rol: tutor. Lista todos los vínculos aceptados del tutor autenticado.
router.get('/my-links', requireRole('tutor'), async (req, res, next) => {
  try {
    const links = await Invitation.find({
      tutorId: req.user._id,
      status: 'accepted',
    })
      .populate('professionalId', 'name email')
      .populate('childId', 'name avatarId')
      .lean();

    return res.json(links);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
