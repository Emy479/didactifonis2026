const { Router } = require('express');
const User = require('../models/User');
const Activity = require('../models/Activity');
const Assignment = require('../models/Assignment');
const ActivityResult = require('../activities/ActivityResult');
const Therapy = require('../models/Therapy');
const Child = require('../models/Child');
const { protect, requireRole } = require('../middleware/auth');

const router = Router();

// Todos los endpoints de admin requieren autenticación y rol admin.
router.use(protect, requireRole('admin'));

// ── GET /api/admin/stats ─────────────────────────────────────────────────────
// Métricas globales de la plataforma.
router.get('/stats', async (req, res, next) => {
  try {
    const [
      totalUsers,
      tutorCount,
      profesionalCount,
      adminCount,
      totalActivities,
      activeActivities,
      completedAssignments,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'tutor' }),
      User.countDocuments({ role: 'profesional' }),
      User.countDocuments({ role: 'admin' }),
      Activity.countDocuments({}),
      Activity.countDocuments({ isActive: true }),
      Assignment.countDocuments({ status: 'completed' }),
    ]);

    return res.json({
      users: {
        total: totalUsers,
        byRole: {
          tutor: tutorCount,
          profesional: profesionalCount,
          admin: adminCount,
        },
      },
      activities: {
        total: totalActivities,
        active: activeActivities,
      },
      assignments: {
        completed: completedAssignments,
      },
    });
  } catch (err) {
    return next(err);
  }
});

// ── GET /api/admin/users ─────────────────────────────────────────────────────
// Lista paginada de usuarios. Filtros opcionales: role, isActive.
router.get('/users', async (req, res, next) => {
  try {
    const { role, isActive, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(filter),
    ]);

    return res.json({ users, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    return next(err);
  }
});

// ── PATCH /api/admin/users/:id/status ────────────────────────────────────────
// Activa o desactiva un usuario. El admin no puede desactivarse a sí mismo.
router.patch('/users/:id/status', async (req, res, next) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive debe ser boolean' });
    }

    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'No puedes desactivar tu propia cuenta' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    return res.json(user);
  } catch (err) {
    return next(err);
  }
});

// ── GET /api/admin/therapies ─────────────────────────────────────────────────
// Lista paginada de todas las terapias.
router.get('/therapies', async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [therapies, total] = await Promise.all([
      Therapy.find(filter)
        .populate('professionalId', 'name email')
        .populate('childId', 'name avatarId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Therapy.countDocuments(filter),
    ]);

    return res.json({ therapies, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    return next(err);
  }
});

// ── GET /api/admin/children ──────────────────────────────────────────────────
// Lista paginada de todos los niños (acceso exclusivo de admin).
router.get('/children', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const [children, total] = await Promise.all([
      Child.find({})
        .populate('tutorId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Child.countDocuments({}),
    ]);
    return res.json({ children, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    return next(err);
  }
});

// ── GET /api/admin/activity-results ─────────────────────────────────────────
// Estadísticas globales de resultados (para dashboard).
router.get('/activity-results', async (req, res, next) => {
  try {
    const [total, passed] = await Promise.all([
      ActivityResult.countDocuments({}),
      ActivityResult.countDocuments({ passed: true }),
    ]);

    return res.json({ total, passed, failed: total - passed });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
