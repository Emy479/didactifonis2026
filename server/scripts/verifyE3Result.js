/**
 * verifyE3Result.js — Contraprueba Mongo del resultado E3 H1 (engine runtime).
 *
 * Uso: node scripts/verifyE3Result.js <assignmentId>
 *
 * Verifica:
 *   - Existe ActivityResult para el assignment.
 *   - maxScore === 20 (engine H1).
 *   - rawScore Number en rango 0..20.
 *   - scorePercent === Math.round(rawScore/maxScore*100) (derivado server-side).
 *   - passed es boolean (derivado server-side).
 *   - attemptCount >= 10 (1+ intentos por ronda, 10 rondas).
 *   - Eventos presentes: activity_started, attempt, item_answered, activity_completed.
 *   - item_answered aparece exactamente 10 veces.
 *   - Ningun evento con type null/vacio.
 *   - El documento NO contiene el string "sessionToken".
 *   - Existe ActivitySessionToken con status:'used' para el assignment.
 *   - Imprime conteo total de eventos (para recalibrar EVENTS_INGEST_CAP).
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const ActivityResult = require('../activities/ActivityResult');
const { ActivitySessionToken } = require('../activities/ActivitySessionToken');

const ASSIGNMENT_ID = process.argv[2];
if (!ASSIGNMENT_ID) {
  console.error('[verify-e3] ERROR: debes pasar el assignmentId como argumento.');
  console.error('  Uso: node scripts/verifyE3Result.js <assignmentId>');
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('[verify-e3] ERROR: MONGODB_URI no definida en .env');
  process.exit(1);
}

// Eventos OBLIGATORIOS en toda sesion del engine H1.
const REQUIRED_EVENT_TYPES = [
  'activity_started',
  'attempt',
  'item_answered',
  'activity_completed',
];

// Evento OPCIONAL (depende de si hubo errores en rondas).
const OPTIONAL_EVENT_TYPES = ['hint_used'];

function pass(label) { console.log('  PASS: ' + label); }
function fail(label, detail) {
  console.error('  FAIL: ' + label + (detail ? ' — ' + detail : ''));
}

async function verify() {
  await mongoose.connect(MONGODB_URI);
  console.log('[verify-e3] Conectado a MongoDB. AssignmentId: ' + ASSIGNMENT_ID);

  const result = await ActivityResult.findOne({ assignmentId: ASSIGNMENT_ID });
  if (!result) {
    fail('ActivityResult encontrado', 'No existe para assignmentId=' + ASSIGNMENT_ID);
    await mongoose.disconnect();
    process.exit(1);
  }
  pass('ActivityResult encontrado (id: ' + result._id + ')');

  let allPassed = true;
  function check(label, condition, detail) {
    if (condition) { pass(label); }
    else { fail(label, detail); allPassed = false; }
  }

  // ── Scores ────────────────────────────────────────────────────────────────────
  check('maxScore === 20',
    result.maxScore === 20,
    'actual: ' + result.maxScore);

  check('rawScore es Number en rango 0..20',
    typeof result.rawScore === 'number' && result.rawScore >= 0 && result.rawScore <= 20,
    'actual: ' + result.rawScore + ' (' + typeof result.rawScore + ')');

  const expectedPercent = (typeof result.rawScore === 'number' && result.maxScore === 20)
    ? Math.round(result.rawScore / 20 * 100)
    : null;
  check('scorePercent derivado server-side (round(rawScore/20*100))',
    result.scorePercent === expectedPercent,
    'esperado: ' + expectedPercent + ', actual: ' + result.scorePercent);

  check('passed es boolean (derivado server-side)',
    typeof result.passed === 'boolean',
    'actual tipo: ' + typeof result.passed + ', valor: ' + result.passed);

  // ── attemptCount ──────────────────────────────────────────────────────────────
  check('attemptCount es Number >= 10',
    typeof result.attemptCount === 'number' && result.attemptCount >= 10,
    'actual: ' + result.attemptCount + ' (' + typeof result.attemptCount + ')');

  // ── Eventos ───────────────────────────────────────────────────────────────────
  const events = result.events || [];
  const eventTypes = events.map(function(e) { return e.type; });

  console.log('\n[verify-e3] Conteo TOTAL de eventos: ' + events.length + ' (para recalibrar EVENTS_INGEST_CAP)');
  console.log('[verify-e3] Tipos en events: ' + JSON.stringify(eventTypes));

  // Eventos obligatorios.
  REQUIRED_EVENT_TYPES.forEach(function(expectedType) {
    check('evento obligatorio presente: ' + expectedType,
      eventTypes.includes(expectedType),
      'no encontrado');
  });

  // Eventos opcionales (reportar sin exigir).
  OPTIONAL_EVENT_TYPES.forEach(function(optType) {
    var count = eventTypes.filter(function(t) { return t === optType; }).length;
    console.log('  INFO: evento opcional "' + optType + '" aparece ' + count + ' veces (no exigido).');
  });

  // item_answered exactamente 10 veces.
  var itemAnsweredCount = eventTypes.filter(function(t) { return t === 'item_answered'; }).length;
  check('item_answered aparece exactamente 10 veces',
    itemAnsweredCount === 10,
    'actual: ' + itemAnsweredCount);

  // Ningun evento con type null/vacio.
  var nullEvents = events.filter(function(e) { return !e.type || typeof e.type !== 'string'; });
  check('ningun evento con type null/vacio',
    nullEvents.length === 0,
    nullEvents.length + ' encontrados');

  // ── Seguridad: sin sessionToken en el documento ───────────────────────────────
  var docStr = JSON.stringify(result.toObject());
  var hasSessionToken = docStr.includes('"sessionToken"');
  check('documento NO contiene campo "sessionToken"',
    !hasSessionToken,
    'campo sensible detectado en el documento');

  // ── ActivitySessionToken consumido ────────────────────────────────────────────
  var usedTokenDoc = await ActivitySessionToken.findOne({ assignmentId: ASSIGNMENT_ID, status: 'used' });
  if (!usedTokenDoc) {
    var allTokens = await ActivitySessionToken.find({ assignmentId: ASSIGNMENT_ID });
    fail('ActivitySessionToken en estado "used" encontrado',
      'Tokens: ' + allTokens.length + ' — statuses: ' + allTokens.map(function(t) { return t.status; }).join(', '));
    allPassed = false;
  } else {
    pass('ActivitySessionToken en estado "used" encontrado (id: ' + usedTokenDoc._id + ')');
  }

  // ── Imprimir documento con ids truncados ──────────────────────────────────────
  var docObj = result.toObject();
  var printable = JSON.parse(JSON.stringify(docObj, function(key, value) {
    if (value && typeof value === 'object' && value.toString && /^[a-f0-9]{24}$/.test(value.toString())) {
      return value.toString().slice(0, 8) + '...';
    }
    return value;
  }));
  console.log('\n[verify-e3] === DOCUMENTO ActivityResult (ids truncados) ===');
  console.log(JSON.stringify(printable, null, 2));

  console.log('\n[verify-e3] === VEREDICTO CONTRAPRUEBA MONGO: ' + (allPassed ? 'VERDE' : 'ROJO') + ' ===');

  await mongoose.disconnect();
  process.exit(allPassed ? 0 : 1);
}

verify().catch(function(err) {
  console.error('[verify-e3] Error inesperado: ' + err.message);
  process.exit(1);
});
