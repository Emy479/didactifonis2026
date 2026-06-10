/**
 * resultsRouter.js — contrato de ingesta de resultados enviado por el juego externo.
 *
 * POST /api/activities/results
 *   Autenticado por sessionToken (no por JWT del tutor). El juego envía el token
 *   obtenido del endpoint de arranque. El token es de un solo uso y expira en 30 min.
 *
 * Seguridad de ingesta (frontera con código externo no confiable):
 *   - Rate limit: 30 req / 15 min por IP (ver resultsLimiter abajo).
 *   - Tamaño máximo de payload: 256 KB (ver express.json limit).
 *   - Validación estricta del token: existencia, no expirado, ids coincidentes.
 *   - Idempotencia atómica por token: si el token ya está 'used', respuesta 200 idempotente.
 *   - Score derivado server-side; cualquier scorePercent/passed del juego es ignorado.
 *   - Eventos: filtrado de malformados + cap defensivo desde shared/index.cjs.
 *
 * Minimización PII (Ley 21.719 — D4 aprobado 2026-06-09):
 *   `childId` NO se exige ni se usa desde el body. Se deriva exclusivamente de
 *   `tokenDoc.childId` (el token fue emitido por el servidor con el childId correcto).
 *   Si el juego envía `childId` en el body (cliente legacy), se IGNORA sin error.
 *   Esto evita que el identificador del menor viaje en el payload del juego externo.
 *
 * Arrastre E0: consume EVENTS_INGEST_CAP, EVENT_TYPES y CONTRACT_VERSION desde
 * shared/index.cjs — sin literales duplicados (ADR-SDK-05).
 *
 * ORDEN DE OPERACIONES (garantía de correctitud):
 *   1. Validar presencia de ids y sessionToken (400/401 sin tocar DB).
 *   2. Leer token en modo solo-lectura → determinar 401/410 antes del claim.
 *      childId se extrae de tokenDoc en este paso; el body no lo provee.
 *   3. Si el token ya está 'used' → camino idempotente (200 + resultId real).
 *   4. Validar rawScore/maxScore (400) → sin efectos colaterales.
 *   5. Cargar assignment y activity (404) → lecturas, sin efectos colaterales.
 *   6. Derivar scorePercent/passed, processEvents, safeMetadata.
 *   7. Claim atómico (findOneAndUpdate unused→used): ÚNICA operación con efecto colateral.
 *      Si devuelve null en este punto, otro proceso se adelantó en carrera → idempotente.
 *   8. ActivityResult.create() + assignment.save().
 *      Si cualquiera lanza, REVERTIR el token a unused antes de propagar el error.
 *
 * Esta secuencia garantiza que el token solo queda 'used' cuando el resultado
 * fue efectivamente persistido, sin degradar la protección anti-doble-registro.
 */

const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const express = require('express');
const ActivityResult = require('./ActivityResult');
const { ActivitySessionToken } = require('./ActivitySessionToken');
const Assignment = require('../models/Assignment');
const Activity = require('../models/Activity');
// Arrastre E0: consumir constantes desde la fuente única de verdad (shared/index.cjs).
// Prohibido re-declarar EVENTS_INGEST_CAP o EVENT_TYPES como literales locales.
const { EVENTS_INGEST_CAP, EVENT_TYPES, CONTRACT_VERSION } = require('../../shared/index.cjs');

const router = Router();

/**
 * Rate limiter específico para ingesta de resultados.
 * Ventana: 15 min. Máximo: 30 requests por IP.
 * Razonamiento: un juego legítimo envía 1 resultado por sesión; 30/15min cubre
 * reenvíos de idempotencia, múltiples niños desde la misma IP de LAN escolar,
 * y errores de red, sin tolerar abuso automatizado.
 * Documentado para auditoría (spec §6.5 / brief E1 §4).
 */
const resultsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiadas solicitudes de resultado. Intenta más tarde.' },
});

/**
 * Límite de tamaño de payload para este endpoint: 256 KB.
 * El payload de resultados tiene score, metadata ligera y events con payloads pequeños.
 * 256 KB es generoso para EVENTS_INGEST_CAP=200 eventos (~1.2 KB/evento promedio)
 * y protege contra payload bomb de código externo no confiable.
 * Documentado para auditoría (spec §6.5 / brief E1 §4).
 */
const resultsJsonParser = express.json({ limit: '256kb' });

/**
 * Filtra y trunca el array de eventos según las políticas Q-EVT-1..3:
 *
 *  Q-EVT-1: events es OPCIONAL. Ausencia o [] → resultado válido sin eventos.
 *  Q-EVT-2: Cap defensivo. Tras filtrar, si count > EVENTS_INGEST_CAP → truncar + log anomalía.
 *  Q-EVT-3: Un type fuera del catálogo (incluidos sin prefijo x_) NO se descarta.
 *           Solo se descartan eventos MALFORMADOS: sin type string o sin timestamp parseable.
 *           No se rechaza por tipo desconocido — se conserva como custom.
 *
 * Nunca lanza excepción: el POST no debe fallar por eventos malformados.
 */
function processEvents(rawEvents, context) {
  if (!Array.isArray(rawEvents)) {
    return [];
  }

  // Filtrar eventos malformados (Q-EVT-1/3): solo se descartan los que carecen de
  // `type` string no vacío o de `timestamp` parseable como ISO 8601.
  const valid = [];
  let discardedCount = 0;

  for (const ev of rawEvents) {
    const hasType = typeof ev.type === 'string' && ev.type.trim().length > 0;
    const tsValue = ev.timestamp;
    const hasTimestamp =
      tsValue !== undefined &&
      tsValue !== null &&
      !isNaN(new Date(tsValue).getTime());

    if (hasType && hasTimestamp) {
      valid.push(ev);
    } else {
      discardedCount++;
    }
  }

  if (discardedCount > 0) {
    // BAJO-3: logging estructurado mínimo. Se omite childId para evitar correlación
    // niño-sesión directa en logs. Solo se registran identificadores de bundle/actividad.
    console.warn('[results ingesta] eventos_malformados', {
      discarded: discardedCount,
      activityId: context.activityId,
    });
  }

  // Cap defensivo (Q-EVT-2): si superamos EVENTS_INGEST_CAP, truncar y registrar anomalía.
  if (valid.length > EVENTS_INGEST_CAP) {
    // BAJO-3: logging estructurado. Se omite childId; se incluye activityId para
    // identificar qué bundle envía volumen anómalo sin correlacionar al menor.
    console.warn('[results ingesta] ANOMALIA_cap_eventos', {
      received: valid.length,
      cap: EVENTS_INGEST_CAP,
      activityId: context.activityId,
      nota: 'revisar bundle del juego',
    });
    return valid.slice(0, EVENTS_INGEST_CAP);
  }

  return valid;
}

// POST / — registrar resultado enviado por el juego externo
router.post('/', resultsLimiter, resultsJsonParser, async (req, res, next) => {
  try {
    const {
      sessionToken,
      assignmentId,
      // childId del body es IGNORADO (minimización PII, D4 2026-06-09).
      // El childId se deriva exclusivamente de tokenDoc.childId (paso 2).
      // Si el juego envía childId en el body (cliente legacy), se descarta silenciosamente.
      activityId,
      rawScore,
      maxScore,
      // scorePercent y passed del body son IGNORADOS (entrada no confiable).
      // Se derivan server-side a partir de rawScore/maxScore/passThreshold.
      attemptCount,
      durationSeconds,
      events,
      metadata,
      schemaVersion,
    } = req.body;

    // ── PASO 1: Validar presencia de campos obligatorios (sin tocar DB) ──────
    // childId ya no es obligatorio en el body: se deriva del token en el PASO 2.
    if (!sessionToken) {
      return res.status(401).json({ message: 'sessionToken es obligatorio' });
    }

    if (!assignmentId || !activityId) {
      return res.status(400).json({ message: 'assignmentId y activityId son obligatorios' });
    }

    // ── PASO 2: Leer token en modo SOLO LECTURA para determinar 401/410 ──────
    // No se modifica el token aquí. Esta lectura no consume el token.
    // childId se extrae del token en este paso (minimización PII — el body no lo provee).
    const now = new Date();
    const tokenDoc = await ActivitySessionToken.findOne({ token: sessionToken }).lean();

    if (!tokenDoc) {
      // No existe en absoluto: inválido o ya expiró y fue purgado por TTL.
      return res.status(401).json({ message: 'sessionToken inválido' });
    }

    if (tokenDoc.expiresAt <= now) {
      return res.status(410).json({ message: 'sessionToken expirado' });
    }

    // Verificar que assignmentId y activityId del body coinciden con los del token.
    // childId NO se verifica contra el body: se deriva exclusivamente de tokenDoc.childId.
    if (
      tokenDoc.assignmentId.toString() !== assignmentId ||
      tokenDoc.activityId.toString() !== activityId
    ) {
      // Token existe pero los ids no coinciden con el body.
      return res.status(401).json({ message: 'sessionToken no corresponde a los ids enviados' });
    }

    // Fuente de verdad del childId: el token (emitido por el servidor con el niño correcto).
    const childId = tokenDoc.childId;

    // ── PASO 3: Camino idempotente — token ya consumido legítimamente ─────────
    // Si el token ya está 'used', devolver el resultado existente sin crear uno nuevo.
    // El resultId nunca es null aquí: si se llegó a 'used', el result fue creado
    // (el claim atómico y el create son un bloque compensado — ver PASO 7/8).
    if (tokenDoc.status === 'used') {
      const existing = await ActivityResult.findOne({ assignmentId, childId, activityId })
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json({
        message: 'Resultado ya registrado (idempotente)',
        resultId: existing ? existing._id : null,
      });
    }

    // ── PASO 4: Validar rawScore/maxScore (400) — sin efectos colaterales ────
    // Esta validación va ANTES del claim atómico.
    // Si falla, el token NO queda consumido y el juego puede reenviar con datos corregidos.
    if (maxScore === undefined || maxScore === null || maxScore <= 0) {
      return res.status(400).json({ message: 'maxScore es obligatorio y debe ser > 0' });
    }
    if (rawScore === undefined || rawScore === null || rawScore < 0) {
      return res.status(400).json({ message: 'rawScore es obligatorio y debe ser >= 0' });
    }

    // Detectar anomalía antes de acotar. BAJO-3: log estructurado sin childId.
    if (rawScore > maxScore) {
      console.warn('[results ingesta] ANOMALIA_score', {
        rawScore,
        maxScore,
        activityId,
        nota: 'scorePercent acotado a 100 — revisar bundle',
      });
    }

    // Derivar scorePercent: clamp(round(rawScore / maxScore * 100), 0, 100)
    const scorePercent = Math.min(100, Math.max(0, Math.round((rawScore / maxScore) * 100)));

    // ── PASO 5: Cargar assignment y activity (404) — lecturas sin efectos ─────
    // Estas lecturas van ANTES del claim atómico.
    // Si fallan (404), el token NO queda consumido.
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment no encontrado' });
    }

    const activity = await Activity.findById(assignment.activityId);
    if (!activity) {
      return res.status(404).json({ message: 'Actividad no encontrada' });
    }

    // ── PASO 6: Derivar passed, processEvents, safeMetadata ──────────────────
    // Todo computable sin efectos colaterales. Va antes del claim.

    // Leer passThreshold de la Activity (autoritativo server-side)
    const passed = scorePercent >= activity.passThreshold;

    // Validar/truncar events (Q-EVT-1/2/3)
    const processedEvents = processEvents(events, { assignmentId, activityId });

    // MEDIO-3: Acotar metadata.
    // metadata debe ser un objeto plano (no array, no primitivo, no clase).
    // Límite: 4096 caracteres JSON serializado. Valor documentado aquí como referencia.
    // Si supera el límite o no es objeto plano, se descarta silenciosamente (no 400)
    // para no romper el flujo de ingesta por metadatos auxiliares malformados.
    const METADATA_MAX_JSON_LENGTH = 4096;
    let safeMetadata = {};
    if (
      metadata !== null &&
      metadata !== undefined &&
      typeof metadata === 'object' &&
      !Array.isArray(metadata) &&
      Object.getPrototypeOf(metadata) === Object.prototype
    ) {
      const serialized = JSON.stringify(metadata);
      if (serialized.length <= METADATA_MAX_JSON_LENGTH) {
        safeMetadata = metadata;
      } else {
        console.warn(
          '[results ingesta] metadata descartada: supera el límite de ' +
          `${METADATA_MAX_JSON_LENGTH} caracteres JSON`
        );
      }
    }

    // ── PASO 7: Claim atómico (ÚNICA operación con efecto colateral) ──────────
    // MEDIO-2: findOneAndUpdate verifica token, estado, expiración y coincidencia
    // de ids en un solo query atómico. Esta es la puerta de idempotencia y protección
    // anti-carrera. Todos los datos ya están validados; si el claim tiene éxito,
    // se persiste el resultado inmediatamente después.
    const claimed = await ActivitySessionToken.findOneAndUpdate(
      {
        token: sessionToken,
        status: 'unused',
        expiresAt: { $gt: now },
        assignmentId,
        childId,
        activityId,
      },
      { status: 'used', usedAt: now },
      { new: false } // queremos saber si existía como 'unused'
    );

    if (!claimed) {
      // Otra solicitud concurrente se adelantó en la ventana entre la lectura (PASO 2)
      // y este claim. El token ya está 'used'. Responder de forma idempotente.
      const existing = await ActivityResult.findOne({ assignmentId, childId, activityId })
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json({
        message: 'Resultado ya registrado (idempotente)',
        resultId: existing ? existing._id : null,
      });
    }

    // ── PASO 8: Persistir resultado y completar assignment ────────────────────
    // Si cualquiera de estas operaciones lanza, el token ya está 'used' pero el
    // resultado no se creó. Compensamos: revertimos el token a 'unused' para que
    // el juego pueda reenviar.
    let result;
    try {
      result = await ActivityResult.create({
        assignmentId,
        childId,
        activityId: assignment.activityId,
        schemaVersion: schemaVersion || CONTRACT_VERSION,
        rawScore,
        maxScore,
        scorePercent,
        passed,
        attemptCount: attemptCount || 1,
        durationSeconds: durationSeconds !== undefined ? durationSeconds : null,
        events: processedEvents,
        metadata: safeMetadata,
      });

      // Efecto sobre el assignment: marcar como completado
      assignment.status = 'completed';
      assignment.completedAt = now;
      await assignment.save();
    } catch (persistErr) {
      // Compensación: revertir el token a 'unused' para que el juego pueda reenviar.
      // Si la reversión también falla, el token queda 'used' sin resultado — se loguea
      // para intervención manual, pero el error original se propaga al caller.
      try {
        await ActivitySessionToken.findOneAndUpdate(
          { token: sessionToken, status: 'used' },
          { status: 'unused', usedAt: null }
        );
        console.warn('[results ingesta] token_revertido', {
          sessionToken: sessionToken.slice(0, 8) + '…', // solo prefijo para no loguear el token completo
          activityId,
          razon: 'fallo_en_persistencia',
        });
      } catch (revertErr) {
        // El token quedó 'used' sin resultado. Situación anómala que requiere intervención.
        console.error('[results ingesta] CRITICO_token_quemado_sin_resultado', {
          activityId,
          persistErr: persistErr.message,
          revertErr: revertErr.message,
        });
      }
      throw persistErr;
    }

    return res.status(201).json({ message: 'Resultado registrado', resultId: result._id });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
