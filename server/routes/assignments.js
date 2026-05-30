const { Router } = require('express');
const Assignment = require('../models/Assignment');
const Activity = require('../models/Activity');
const Child = require('../models/Child');
const { protect, requireActiveSubscription } = require('../middleware/auth');

const router = Router();

const ACTIVITY_POPULATE = 'title type difficultyLevel durationMinutes thumbnailUrl bundleUrl';

// GET / — listar assignments de un niño
router.get('/', protect, requireActiveSubscription, async (req, res, next) => {
  try {
    const { childId, status } = req.query;

    if (!childId) {
      return res.status(400).json({ message: 'childId es obligatorio' });
    }

    const child = await Child.findById(childId);
    if (!child) {
      return res.status(404).json({ message: 'Niño no encontrado' });
    }

    const userId = req.user._id.toString();
    const isTutor = req.user.role === 'tutor' && child.tutorId.toString() === userId;
    const isPro =
      req.user.role === 'profesional' &&
      child.accessGrants.some((g) => g.toString() === userId);

    if (!isTutor && !isPro && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Sin permiso para este recurso' });
    }

    const filter = { childId };
    if (status) filter.status = status;

    const assignments = await Assignment.find(filter).populate('activityId', ACTIVITY_POPULATE);
    return res.json(assignments);
  } catch (err) {
    return next(err);
  }
});

// POST / — crear assignment
router.post('/', protect, requireActiveSubscription, async (req, res, next) => {
  try {
    const { activityId, childId, dueDate } = req.body;

    const child = await Child.findById(childId);
    if (!child) {
      return res.status(404).json({ message: 'Niño no encontrado' });
    }

    const userId = req.user._id.toString();
    const isTutor = req.user.role === 'tutor' && child.tutorId.toString() === userId;
    const isPro =
      req.user.role === 'profesional' &&
      child.accessGrants.some((g) => g.toString() === userId);

    if (!isTutor && !isPro) {
      return res.status(403).json({ message: 'Sin permiso para este recurso' });
    }

    const activity = await Activity.findById(activityId);
    if (!activity || !activity.isActive) {
      return res.status(404).json({ message: 'Actividad no encontrada' });
    }

    if (isTutor && !activity.availableToTutors) {
      return res.status(403).json({ message: 'Esta actividad no esta disponible para tutores' });
    }

    const assignment = await Assignment.create({
      activityId,
      childId,
      assignedBy: req.user._id,
      assignedByRole: req.user.role,
      dueDate: dueDate || null,
    });

    await assignment.populate('activityId', ACTIVITY_POPULATE);
    return res.status(201).json(assignment);
  } catch (err) {
    return next(err);
  }
});

// PATCH /:id/status — actualizar estado
router.patch('/:id/status', protect, requireActiveSubscription, async (req, res, next) => {
  try {
    const { status } = req.body;

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment no encontrado' });
    }

    if (assignment.assignedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Sin permiso para este recurso' });
    }

    assignment.status = status;
    if (status === 'completed') {
      assignment.completedAt = new Date();
    }

    await assignment.save();
    return res.json(assignment);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
