const { Router } = require('express');
const ActivityResult = require('./ActivityResult');
const Assignment = require('../models/Assignment');
const Child = require('../models/Child');
const { protect, requireActiveSubscription } = require('../middleware/auth');

const router = Router();

// POST / — registrar resultado enviado por el juego externo
router.post('/', protect, requireActiveSubscription, async (req, res, next) => {
  try {
    const {
      assignmentId,
      childId,
      score,
      passed,
      attemptCount,
      durationSeconds,
      metadata,
      schemaVersion,
    } = req.body;

    if (!assignmentId || !childId) {
      return res.status(400).json({ message: 'assignmentId y childId son obligatorios' });
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment no encontrado' });
    }

    if (assignment.childId.toString() !== childId) {
      return res.status(400).json({ message: 'childId no coincide con el assignment' });
    }

    const child = await Child.findById(childId);
    if (!child || child.tutorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Sin permiso para este recurso' });
    }

    if (assignment.status === 'completed') {
      return res.status(409).json({ message: 'Esta actividad ya fue completada' });
    }

    const result = await ActivityResult.create({
      assignmentId,
      childId,
      activityId: assignment.activityId,
      schemaVersion: schemaVersion || '1.0',
      score: score !== undefined ? score : null,
      passed: passed !== undefined ? passed : null,
      attemptCount: attemptCount || 1,
      durationSeconds: durationSeconds !== undefined ? durationSeconds : null,
      metadata: metadata || {},
    });

    assignment.status = 'completed';
    assignment.completedAt = new Date();
    await assignment.save();

    return res.status(201).json({ message: 'Resultado registrado', resultId: result._id });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
