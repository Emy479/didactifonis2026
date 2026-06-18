const { Router } = require('express');
const Child = require('../models/Child');
const Assignment = require('../models/Assignment');
const ActivityResult = require('../activities/ActivityResult');
const Therapy = require('../models/Therapy');
const { protect, requireRole, requireActiveSubscription } = require('../middleware/auth');
const { validateTherapyFields } = require('./therapyValidation');

const router = Router();

// Todos los endpoints requieren profesional autenticado con suscripción activa.
router.use(protect, requireRole('profesional'), requireActiveSubscription);

// ── Utilidad: calcular progreso general de un niño ───────────────────────────
async function calcularProgresoNino(childId) {
  const results = await ActivityResult.find({ childId }).lean();
  const total = results.length;
  const passed = results.filter((r) => r.passed === true).length;
  const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;
  const lastResult = results.length > 0
    ? results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
    : null;
  return { total, passed, successRate, lastResult };
}

// ── GET /api/professional/patients ───────────────────────────────────────────
// Lista de niños donde accessGrants incluye al profesional autenticado.
router.get('/patients', async (req, res, next) => {
  try {
    const proId = req.user._id;

    const patients = await Child.find({ accessGrants: proId, isActive: true })
      .populate('tutorId', 'name email')
      .lean();

    // Para cada paciente, añadir progreso general y último assignment
    const patientsWithProgress = await Promise.all(
      patients.map(async (child) => {
        const [progress, lastAssignment] = await Promise.all([
          calcularProgresoNino(child._id),
          Assignment.findOne({ childId: child._id })
            .sort({ createdAt: -1 })
            .populate('activityId', 'title type')
            .lean(),
        ]);
        return { ...child, progress, lastAssignment };
      })
    );

    return res.json(patientsWithProgress);
  } catch (err) {
    return next(err);
  }
});

// ── GET /api/professional/therapies ─────────────────────────────────────────
// Terapias del profesional autenticado.
router.get('/therapies', async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = { professionalId: req.user._id };
    if (status) filter.status = status;

    const therapies = await Therapy.find(filter)
      .populate('childId', 'name avatarId birthDate')
      .sort({ createdAt: -1 })
      .lean();

    // Añadir progreso general de cada paciente
    const therapiesWithProgress = await Promise.all(
      therapies.map(async (therapy) => {
        const progress = therapy.childId
          ? await calcularProgresoNino(therapy.childId._id)
          : { total: 0, passed: 0, successRate: 0 };
        return { ...therapy, progress };
      })
    );

    return res.json(therapiesWithProgress);
  } catch (err) {
    return next(err);
  }
});

// ── POST /api/professional/therapies ────────────────────────────────────────
// Crear terapia. El paciente debe estar en accessGrants del profesional.
router.post('/therapies', async (req, res, next) => {
  try {
    const { name, childId, therapeuticGoal, startDate } = req.body;

    // Validar forma de los campos ANTES de tocar la DB.
    const validation = validateTherapyFields({ name, therapeuticGoal, startDate }, { partial: false });
    if (!validation.ok) {
      return res.status(400).json({ message: validation.message });
    }

    if (!childId) {
      return res.status(400).json({ message: 'childId es obligatorio' });
    }

    const child = await Child.findById(childId);
    if (!child || !child.isActive) {
      return res.status(404).json({ message: 'Paciente no encontrado' });
    }

    const tieneAcceso = child.accessGrants.some(
      (g) => g.toString() === req.user._id.toString()
    );
    if (!tieneAcceso) {
      return res.status(403).json({ message: 'Sin permiso para este paciente' });
    }

    const therapy = await Therapy.create({
      name: validation.value.name,
      childId,
      professionalId: req.user._id,
      therapeuticGoal: validation.value.therapeuticGoal !== undefined
        ? validation.value.therapeuticGoal
        : null,
      startDate: validation.value.startDate || new Date(),
      createdBy: req.user._id,
    });

    await therapy.populate('childId', 'name avatarId');
    return res.status(201).json(therapy);
  } catch (err) {
    return next(err);
  }
});

// ── PATCH /api/professional/therapies/:id ───────────────────────────────────
// Editar terapia propia.
router.patch('/therapies/:id', async (req, res, next) => {
  try {
    const therapy = await Therapy.findById(req.params.id);
    if (!therapy) {
      return res.status(404).json({ message: 'Terapia no encontrada' });
    }

    if (therapy.professionalId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Sin permiso para esta terapia' });
    }

    const { name, therapeuticGoal, status, sessions } = req.body;

    // Validar forma de los campos ANTES de asignar al documento.
    const validation = validateTherapyFields({ name, therapeuticGoal, status, sessions }, { partial: true });
    if (!validation.ok) {
      return res.status(400).json({ message: validation.message });
    }

    if (validation.value.name !== undefined) therapy.name = validation.value.name;
    if (validation.value.therapeuticGoal !== undefined) therapy.therapeuticGoal = validation.value.therapeuticGoal;
    if (validation.value.status !== undefined) therapy.status = validation.value.status;
    if (validation.value.sessions !== undefined) therapy.sessions = validation.value.sessions;

    await therapy.save();
    await therapy.populate('childId', 'name avatarId');
    return res.json(therapy);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
