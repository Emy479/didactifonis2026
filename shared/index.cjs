/**
 * shared/index.cjs — Versión CommonJS de las constantes compartidas.
 *
 * INTEROP ESM/CJS:
 * El cliente (Vite/ESM) importa shared/index.js (sintaxis `export const`).
 * El server (Node.js/CJS) hace require('../../shared/index.cjs').
 * Este archivo espeja todas las constantes de index.js en formato CJS,
 * manteniendo ambos sin tocar sus sistemas de módulos. Es el mecanismo
 * mínimo que evita transformaciones de build.
 *
 * Al añadir una constante nueva: actualizar AMBOS archivos en paralelo.
 */

// ── Roles ────────────────────────────────────────────────────────────────────
const ROLES = {
  ADMIN: 'admin',
  PROFESIONAL: 'profesional',
  TUTOR: 'tutor',
};

// ── Versión del contrato de ingesta de resultados ────────────────────────────
// Contrato 2.B, cerrado en v0.6. Ver docs/plan-sdk-engine-juegos.md §2.B.
const CONTRACT_VERSION = '1.0';

// ── Catálogo de tipos de evento v1.0 ─────────────────────────────────────────
// Capa 1 educativa — telemetría de sesión. No se derivan métricas clínicas de estos eventos.
// Los juegos externos DEBEN usar solo estos tipos en el campo `events[].type`.
// Tipos desconocidos (fuera de catálogo, sin prefijo x_) se CONSERVAN como custom — NO se rechazan (Q-EVT-3).
// El SDK emite un warning en dev para tipos no estándar. El backend los almacena sin derivar métrica.
const EVENT_TYPES = {
  ACTIVITY_STARTED: 'activity_started',
  ACTIVITY_COMPLETED: 'activity_completed',
  PAUSED: 'paused',
  RESUMED: 'resumed',
  ABANDONED: 'abandoned',
  ATTEMPT: 'attempt',
  ITEM_ANSWERED: 'item_answered',
  HINT_USED: 'hint_used',
  LEVEL_ADVANCED: 'level_advanced',
};

// ── Cap defensivo de ingesta de eventos ──────────────────────────────────────
// PROVISIONAL — a recalibrar en E2 con datos reales de sesión.
// Protección del servidor: integridad del documento (límite 16 MB MongoDB)
// y defensa contra payload no confiable. NO es un tope de contrato de juego.
const EVENTS_INGEST_CAP = 200;

// ── Forma canónica del contrato de resultados 2.B ────────────────────────────
// Referencia de campos aceptados en POST /api/activities/results.
// Validación estricta implementada en E1. Aquí: descripción compartida.
const RESULT_CONTRACT_SHAPE = {
  // Obligatorios
  assignmentId: 'string (ObjectId)',
  childId: 'string (ObjectId)',
  // Puntuación (Capa 1 educativa, entrada no confiable del juego)
  rawScore: 'number | null — puntuación cruda en escala del juego',
  maxScore: 'number | null — máximo de la escala interna del juego',
  // scorePercent y passed son DERIVADOS server-side en E1; el juego puede omitirlos
  scorePercent: 'number (0–100) | null — canónico, derivado server-side',
  passed: 'boolean | null — derivado server-side usando passThreshold de la actividad',
  // Sesión
  attemptCount: 'number — intentos dentro de esta sesión',
  durationSeconds: 'number | null — duración total en segundos',
  events: 'array de { type: EVENT_TYPES[key], timestamp: ISO8601, payload?: object }',
  // Meta
  schemaVersion: 'string — versión del contrato (CONTRACT_VERSION)',
  metadata: 'object — datos adicionales libres del juego (no se procesan)',
};

module.exports = {
  ROLES,
  CONTRACT_VERSION,
  EVENT_TYPES,
  EVENTS_INGEST_CAP,
  RESULT_CONTRACT_SHAPE,
};
