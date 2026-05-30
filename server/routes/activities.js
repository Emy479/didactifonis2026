const { Router } = require('express');
const Activity = require('../models/Activity');
const { protect, requireRole, requireActiveSubscription } = require('../middleware/auth');

const router = Router();

// GET / — lista actividades según rol
router.get('/', protect, requireActiveSubscription, async (req, res, next) => {
  try {
    const { type, difficultyLevel } = req.query;
    const filter = { isActive: true };

    if (req.user.role === 'tutor') {
      filter.availableToTutors = true;
    }
    if (type) filter.type = type;
    if (difficultyLevel) filter.difficultyLevel = Number(difficultyLevel);

    const activities = await Activity.find(filter).sort({ difficultyLevel: 1 });
    return res.json(activities);
  } catch (err) {
    return next(err);
  }
});

// GET /:id — detalle de actividad
router.get('/:id', protect, requireActiveSubscription, async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.id);

    if (!activity || !activity.isActive) {
      return res.status(404).json({ message: 'Actividad no encontrada' });
    }

    if (req.user.role === 'tutor' && !activity.availableToTutors) {
      return res.status(403).json({ message: 'Sin permiso para este recurso' });
    }

    return res.json(activity);
  } catch (err) {
    return next(err);
  }
});

// POST / — crear actividad (solo admin)
router.post('/', protect, requireRole('admin'), async (req, res, next) => {
  try {
    const {
      title,
      type,
      therapeuticGoal,
      difficultyLevel,
      ageRange,
      durationMinutes,
      availableToTutors,
      thumbnailUrl,
      bundleUrl,
    } = req.body;

    const activity = await Activity.create({
      title,
      type,
      therapeuticGoal,
      difficultyLevel,
      ageRange,
      durationMinutes,
      availableToTutors,
      thumbnailUrl,
      bundleUrl,
      createdBy: req.user._id,
    });

    return res.status(201).json(activity);
  } catch (err) {
    return next(err);
  }
});

// PUT /:id — actualizar actividad (solo admin)
router.put('/:id', protect, requireRole('admin'), async (req, res, next) => {
  try {
    const { createdBy, ...updateData } = req.body;

    const activity = await Activity.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!activity) {
      return res.status(404).json({ message: 'Actividad no encontrada' });
    }

    return res.json(activity);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
