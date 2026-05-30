const { Router } = require('express');
const Child = require('../models/Child');
const Activity = require('../models/Activity');
const ActivityResult = require('../activities/ActivityResult');
const { protect, requireActiveSubscription } = require('../middleware/auth');

const router = Router();

// ── Utilidad: verificar acceso al niño ──────────────────────────────────────
async function verificarAcceso(child, user) {
  if (!child) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'tutor') {
    return child.tutorId.toString() === user._id.toString();
  }
  if (user.role === 'profesional') {
    return child.accessGrants.some((g) => g.toString() === user._id.toString());
  }
  return false;
}

// ── Utilidad: calcular racha de días consecutivos ───────────────────────────
function calcularRacha(results) {
  if (!results.length) return 0;

  // Obtener días únicos con al menos un resultado completado
  const dias = [
    ...new Set(
      results
        .filter((r) => r.passed !== null)
        .map((r) => new Date(r.createdAt).toISOString().slice(0, 10))
    ),
  ].sort((a, b) => (a > b ? -1 : 1)); // desc

  if (!dias.length) return 0;

  let racha = 1;
  for (let i = 0; i < dias.length - 1; i++) {
    const actual = new Date(dias[i]);
    const siguiente = new Date(dias[i + 1]);
    const diffDias = Math.round((actual - siguiente) / (1000 * 60 * 60 * 24));
    if (diffDias === 1) {
      racha++;
    } else {
      break;
    }
  }
  return racha;
}

// ── Utilidad: calcular logros desbloqueados (Capa 1, no clínico) ─────────────
// Todos los logros son educativos/motivacionales. Sin scoring clínico.
function calcularLogros(results, streak) {
  const total = results.length;
  const passed = results.filter((r) => r.passed === true).length;

  const logros = [
    {
      id: 'primer-paso',
      title: 'Primeros pasos',
      description: 'Completaste tu primera actividad',
      icon: '🌟',
      category: 'inicio',
      unlocked: total >= 1,
      progress: Math.min(total, 1),
      goal: 1,
    },
    {
      id: 'cinco-actividades',
      title: 'Pequeños pasos',
      description: 'Completaste 5 actividades',
      icon: '👣',
      category: 'progreso',
      unlocked: total >= 5,
      progress: Math.min(total, 5),
      goal: 5,
    },
    {
      id: 'diez-actividades',
      title: 'Explorador curioso',
      description: 'Completaste 10 actividades',
      icon: '🔭',
      category: 'progreso',
      unlocked: total >= 10,
      progress: Math.min(total, 10),
      goal: 10,
    },
    {
      id: 'primer-exito',
      title: 'Siempre adelante',
      description: 'Superaste tu primera actividad con éxito',
      icon: '🏆',
      category: 'logro',
      unlocked: passed >= 1,
      progress: Math.min(passed, 1),
      goal: 1,
    },
    {
      id: 'cinco-exitos',
      title: 'Esfuerzo y dedicación',
      description: 'Superaste 5 actividades con éxito',
      icon: '🎖️',
      category: 'logro',
      unlocked: passed >= 5,
      progress: Math.min(passed, 5),
      goal: 5,
    },
    {
      id: 'racha-3',
      title: 'Semanas activas',
      description: 'Completaste actividades 3 días seguidos',
      icon: '🔥',
      category: 'constancia',
      unlocked: streak >= 3,
      progress: Math.min(streak, 3),
      goal: 3,
    },
    {
      id: 'racha-7',
      title: 'Racha imparable',
      description: 'Completaste actividades 7 días seguidos',
      icon: '⚡',
      category: 'constancia',
      unlocked: streak >= 7,
      progress: Math.min(streak, 7),
      goal: 7,
    },
    {
      id: 'lector-nato',
      title: 'Primera lectura',
      description: 'Completaste una actividad de tipo Palabra',
      icon: '📖',
      category: 'habilidad',
      unlocked: results.some((r) => r.activityType === 'palabra'),
      progress: results.filter((r) => r.activityType === 'palabra').length > 0 ? 1 : 0,
      goal: 1,
    },
  ];

  return logros;
}

// ── GET /api/progress/:childId ───────────────────────────────────────────────
// Progreso completo de un niño: KPIs, por área, racha, logros, semanal.
// RBAC: tutor propietario, profesional con accessGrant, admin.
router.get('/:childId', protect, requireActiveSubscription, async (req, res, next) => {
  try {
    const child = await Child.findById(req.params.childId);
    if (!child || !child.isActive) {
      return res.status(404).json({ message: 'Niño no encontrado' });
    }

    const tieneAcceso = await verificarAcceso(child, req.user);
    if (!tieneAcceso) {
      return res.status(403).json({ message: 'Sin permiso para este recurso' });
    }

    // Obtener todos los resultados del niño con datos de la actividad
    const results = await ActivityResult.find({ childId: child._id })
      .populate('activityId', 'type')
      .sort({ createdAt: -1 })
      .lean();

    // Enriquecer resultados con el tipo de actividad
    const resultsEnriquecidos = results.map((r) => ({
      ...r,
      activityType: r.activityId?.type || 'otro',
    }));

    // KPIs globales
    const total = resultsEnriquecidos.length;
    const passed = resultsEnriquecidos.filter((r) => r.passed === true).length;
    const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;

    // Progreso por tipo → áreas de desarrollo
    const tipos = ['fonema', 'silaba', 'palabra', 'comprension', 'otro'];
    const byType = {};
    for (const tipo of tipos) {
      const delTipo = resultsEnriquecidos.filter((r) => r.activityType === tipo);
      const passedTipo = delTipo.filter((r) => r.passed === true).length;
      byType[tipo] = {
        completed: delTipo.length,
        passed: passedTipo,
        successRate: delTipo.length > 0 ? Math.round((passedTipo / delTipo.length) * 100) : 0,
      };
    }

    // Mapeo a áreas de la UI (Tut_Progreso.png)
    const areas = {
      pronunciacion: byType.fonema,
      comprension: byType.comprension,
      concienciaFonologica: {
        completed: byType.silaba.completed + byType.palabra.completed,
        passed: byType.silaba.passed + byType.palabra.passed,
        successRate:
          byType.silaba.completed + byType.palabra.completed > 0
            ? Math.round(
                ((byType.silaba.passed + byType.palabra.passed) /
                  (byType.silaba.completed + byType.palabra.completed)) *
                  100
              )
            : 0,
      },
      participacion: byType.otro,
    };

    // Racha de días consecutivos
    const streak = calcularRacha(resultsEnriquecidos);

    // Estadísticas semanales (últimos 7 días)
    const hace7Dias = new Date();
    hace7Dias.setDate(hace7Dias.getDate() - 7);
    const resultadosSemana = resultsEnriquecidos.filter(
      (r) => new Date(r.createdAt) >= hace7Dias
    );
    const tiempoTotalSegundos = resultadosSemana.reduce(
      (acc, r) => acc + (r.durationSeconds || 0),
      0
    );
    const weeklyStats = {
      activitiesCount: resultadosSemana.length,
      timeMinutes: Math.round(tiempoTotalSegundos / 60),
      streak,
    };

    // Última actividad
    const lastActivity = resultsEnriquecidos[0] || null;

    // Logros
    const achievements = calcularLogros(resultsEnriquecidos, streak);

    // Historial para gráfico (últimos 30 días, agrupado por día)
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);
    const resultados30 = resultsEnriquecidos.filter(
      (r) => new Date(r.createdAt) >= hace30Dias
    );
    const historialPorDia = {};
    for (const r of resultados30) {
      const dia = new Date(r.createdAt).toISOString().slice(0, 10);
      if (!historialPorDia[dia]) {
        historialPorDia[dia] = { completed: 0, passed: 0 };
      }
      historialPorDia[dia].completed++;
      if (r.passed === true) historialPorDia[dia].passed++;
    }
    const history = Object.entries(historialPorDia)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => (a.date > b.date ? 1 : -1));

    return res.json({
      childId: child._id,
      childName: child.name,
      kpis: { total, passed, successRate },
      areas,
      weeklyStats,
      lastActivity,
      achievements,
      history,
    });
  } catch (err) {
    return next(err);
  }
});

// ── GET /api/progress/:childId/achievements ──────────────────────────────────
// Solo los logros del niño (lista completa con estado locked/unlocked).
router.get('/:childId/achievements', protect, requireActiveSubscription, async (req, res, next) => {
  try {
    const child = await Child.findById(req.params.childId);
    if (!child || !child.isActive) {
      return res.status(404).json({ message: 'Niño no encontrado' });
    }

    const tieneAcceso = await verificarAcceso(child, req.user);
    if (!tieneAcceso) {
      return res.status(403).json({ message: 'Sin permiso para este recurso' });
    }

    const results = await ActivityResult.find({ childId: child._id })
      .populate('activityId', 'type')
      .lean();

    const resultsEnriquecidos = results.map((r) => ({
      ...r,
      activityType: r.activityId?.type || 'otro',
    }));

    const streak = calcularRacha(resultsEnriquecidos);
    const achievements = calcularLogros(resultsEnriquecidos, streak);

    return res.json({ childId: child._id, childName: child.name, achievements, streak });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
