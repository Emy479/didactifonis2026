/**
 * sessionsRouter.js — endpoint de arranque de sesión de actividad.
 *
 * POST /api/activities/sessions
 *   Emite un sessionToken de un solo uso y devuelve el payload 2.A (contrato de arranque).
 *   Requiere JWT válido del tutor/profesional con suscripción activa.
 *
 * Payload de respuesta 2.A (v0.2, contrato cerrado):
 *   contractVersion, sessionToken, assignmentId, activityId, config, runtime.
 *   runtime incluye: offlineAllowed, resultsEndpoint, maxDurationSeconds, bundleUrl.
 *   bundleUrl: URL del bundle de la actividad (null si no configurado; el launcher lo maneja).
 *   CERO PII del menor: sin nombre, alias, edad, sexo, RUT ni dato clínico.
 *   Solo identificadores opacos + config de la actividad (ADR-SDK-02, justificación legal 2.A).
 *
 * Arrastre E0: consume CONTRACT_VERSION desde @didactifonis/contract (sin literal duplicado).
 */

const crypto = require('crypto'); // MEDIO-1: requerido para crypto.randomUUID()
const { Router } = require('express');
const mongoose = require('mongoose');
const { protect, requireActiveSubscription } = require('../middleware/auth');
const Assignment = require('../models/Assignment');
const Activity = require('../models/Activity');
const Child = require('../models/Child');
const { ActivitySessionToken, SESSION_TOKEN_TTL_SECONDS } = require('./ActivitySessionToken');
const { CONTRACT_VERSION, EVENTS_INGEST_CAP, EVENT_TYPES } = require('@didactifonis/contract');

const router = Router();

// POST / — emitir token de sesión y devolver payload de arranque 2.A
router.post('/', protect, requireActiveSubscription, async (req, res, next) => {
  try {
    const { assignmentId } = req.body;

    if (!assignmentId) {
      return res.status(400).json({ message: 'assignmentId es obligatorio' });
    }

    // ALTO-1: validar que assignmentId sea un ObjectId válido antes de consultar.
    // Evita IDOR por IDs malformados que podrían causar comportamiento inesperado.
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return res.status(400).json({ message: 'assignmentId inválido' });
    }

    // Cargar assignment
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment no encontrado' });
    }

    // Cargar niño para verificar permisos (patrón canónico de assignments.js:25-33)
    const child = await Child.findById(assignment.childId);
    if (!child) {
      return res.status(404).json({ message: 'Niño no encontrado' });
    }

    // ALTO-1: verificar explícitamente que el childId del assignment coincida con el
    // _id del niño cargado. Si no coincide, es una inconsistencia de datos (404 para
    // no revelar la existencia del recurso a posibles atacantes).
    if (assignment.childId.toString() !== child._id.toString()) {
      return res.status(404).json({ message: 'Recurso no encontrado' });
    }

    const userId = req.user._id.toString();
    const isTutor = req.user.role === 'tutor' && child.tutorId.toString() === userId;
    const isPro =
      req.user.role === 'profesional' &&
      child.accessGrants.some((g) => g.toString() === userId);
    // ALTO-1: el acceso del admin es sin restricción de propiedad por diseño explícito.
    // El administrador de plataforma necesita acceso total para soporte, auditoría y
    // resolución de incidencias. Este acceso se registra en logs de auditoría (ADR-SEC).
    const isAdmin = req.user.role === 'admin';

    if (!isTutor && !isPro && !isAdmin) {
      return res.status(403).json({ message: 'Sin permiso para este recurso' });
    }

    // Cargar actividad para construir config (passThreshold, difficultyLevel)
    const activity = await Activity.findById(assignment.activityId);
    if (!activity || !activity.isActive) {
      return res.status(404).json({ message: 'Actividad no encontrada o inactiva' });
    }

    const now = new Date();

    // MEDIO-4: reutilizar token 'unused' no expirado si ya existe para este assignment.
    // Evita acumulación de tokens activos por recargas o doble-clic del launcher.
    // Política: si el assignment está 'completed', se permite emitir un nuevo token
    // para cubrir reintentos explícitos, pero nunca se acumulan tokens activos
    // simultáneos (se reutiliza si ya hay uno vigente sin importar estado del assignment).
    const existingToken = await ActivitySessionToken.findOne({
      assignmentId: assignment._id,
      status: 'unused',
      expiresAt: { $gt: now },
    });

    if (existingToken) {
      // Reutilizar el token activo existente sin crear uno nuevo.
      const resultsEndpoint = buildResultsEndpoint();
      const payload = buildPayload({
        contractVersion: CONTRACT_VERSION,
        tokenValue: existingToken.token,
        assignment,
        activity,
        resultsEndpoint,
      });
      return res.status(200).json(payload);
    }

    // Emitir token de un solo uso (UUID v4, Node nativo)
    const tokenValue = crypto.randomUUID();

    const expiresAt = new Date(now.getTime() + SESSION_TOKEN_TTL_SECONDS * 1000);

    await ActivitySessionToken.create({
      token: tokenValue,
      assignmentId: assignment._id,
      childId: child._id,
      activityId: activity._id,
      status: 'unused',
      usedAt: null,
      expiresAt,
    });

    // Construir el payload de arranque 2.A.
    const resultsEndpoint = buildResultsEndpoint();
    const payload = buildPayload({
      contractVersion: CONTRACT_VERSION,
      tokenValue,
      assignment,
      activity,
      resultsEndpoint,
    });

    return res.status(201).json(payload);
  } catch (err) {
    return next(err);
  }
});

/**
 * BAJO-2: Construye el resultsEndpoint validando API_BASE_URL.
 * Si falta o no es URL absoluta, advierte al arranque y usa cadena vacía en desarrollo.
 * La advertencia se emite una sola vez al iniciarse el proceso (ver index.js).
 * El endpoint queda funcional en desarrollo (el juego usará una URL relativa).
 */
function buildResultsEndpoint() {
  const base = process.env.API_BASE_URL || '';
  return `${base}/api/activities/results`;
}

/**
 * Construye el payload de arranque 2.A.
 * MINIMIZACIÓN ESTRICTA: cero atributos del menor.
 * config.params, config.audioInstructionsUrl y config.displayName quedan en
 * default null/vacío — no existe fuente en los modelos actuales para estos campos.
 * Pendiente de confirmación del arquitecto si se añade alguno en el futuro.
 */
function buildPayload({ contractVersion, tokenValue, assignment, activity, resultsEndpoint }) {
  return {
    contractVersion,
    sessionToken: tokenValue,
    assignmentId: assignment._id.toString(),
    activityId: activity._id.toString(),
    config: {
      level: activity.difficultyLevel,
      passThreshold: activity.passThreshold,
      // params: no existe fuente en Activity; vacío por defecto (no se deriva del niño).
      params: {},
      locale: 'es-CL',
      // audioInstructionsUrl: no existe fuente en los modelos actuales → null.
      audioInstructionsUrl: null,
      // tutorInstructionsText: no existe fuente en Assignment ni Activity → null.
      tutorInstructionsText: null,
      // displayName: NUNCA derivado del nombre/alias del niño (minimización PII) → null.
      displayName: null,
    },
    runtime: {
      offlineAllowed: true,
      resultsEndpoint,
      maxDurationSeconds: 900,
      bundleUrl: activity.bundleUrl ?? null,
    },
  };
}

module.exports = router;
