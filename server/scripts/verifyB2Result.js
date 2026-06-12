/**
 * verifyB2Result.js -- Contraprueba Mongo del resultado del smoke E2E B-2.
 *
 * Uso: node scripts/verifyB2Result.js <assignmentId>
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const ActivityResult = require('../activities/ActivityResult');
const { ActivitySessionToken } = require('../activities/ActivitySessionToken');

const ASSIGNMENT_ID = process.argv[2];
if (!ASSIGNMENT_ID) {
  console.error('[verify] ERROR: debes pasar el assignmentId como argumento.');
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('[verify] ERROR: MONGODB_URI no definida en .env');
  process.exit(1);
}

const EXPECTED_EVENT_TYPES = [
  'activity_started',
  'attempt',
  'item_answered',
  'hint_used',
  'x_b2_custom',
  'evento_fuera_catalogo',
  'activity_completed',
];

function pass(label) { console.log('  PASS: ' + label); }
function fail(label, detail) {
  console.error('  FAIL: ' + label + (detail ? ' -- ' + detail : ''));
}

async function verify() {
  await mongoose.connect(MONGODB_URI);
  console.log('[verify] Conectado a MongoDB. AssignmentId: ' + ASSIGNMENT_ID);

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

  check('rawScore === 80',      result.rawScore === 80,      'actual: ' + result.rawScore);
  check('maxScore === 100',     result.maxScore === 100,     'actual: ' + result.maxScore);
  check('scorePercent === 80',  result.scorePercent === 80,  'actual: ' + result.scorePercent);
  check('passed === true',      result.passed === true,      'actual: ' + result.passed);
  check('attemptCount === 2',   result.attemptCount === 2,   'actual: ' + result.attemptCount);
  check(
    'durationSeconds es Number >= 0',
    typeof result.durationSeconds === 'number' && result.durationSeconds >= 0,
    'actual: ' + result.durationSeconds + ' (' + typeof result.durationSeconds + ')'
  );
  check('metadata.b2SmokeTest === true',
    result.metadata && result.metadata.b2SmokeTest === true,
    'actual: ' + JSON.stringify(result.metadata));
  check('metadata.sdkVersion === 0.1.0',
    result.metadata && result.metadata.sdkVersion === '0.1.0',
    'actual: ' + JSON.stringify(result.metadata));
  check('schemaVersion === 1.0', result.schemaVersion === '1.0', 'actual: ' + result.schemaVersion);

  const events = result.events || [];
  const eventTypes = events.map((e) => e.type);
  console.log('\n[verify] Conteo total de eventos: ' + events.length + ' (para recalibrar EVENTS_INGEST_CAP)');
  console.log('[verify] Tipos en events: ' + JSON.stringify(eventTypes));

  EXPECTED_EVENT_TYPES.forEach((expectedType) => {
    check('evento presente: ' + expectedType, eventTypes.includes(expectedType), 'no encontrado');
  });

  const attemptCount = eventTypes.filter((t) => t === 'attempt').length;
  check('attempt aparece 2 veces', attemptCount === 2, 'actual: ' + attemptCount);

  const nullEvents = events.filter((e) => !e.type || typeof e.type !== 'string');
  check('ningun evento con type null/vacio', nullEvents.length === 0, nullEvents.length + ' encontrados');

  const docStr = JSON.stringify(result.toObject());
  const hasSessionToken = docStr.includes('"sessionToken"');
  check('documento no contiene campo sessionToken', !hasSessionToken, 'campo sensible detectado');

  // Puede existir mas de un token por assignment (p.ej. si el GameHost emitio dos requests
  // de contexto). Buscamos el token que fue efectivamente consumido (status: 'used').
  const usedTokenDoc = await ActivitySessionToken.findOne({ assignmentId: ASSIGNMENT_ID, status: 'used' });
  if (!usedTokenDoc) {
    // Fallback: mostrar todos los tokens del assignment para diagnostico
    const allTokens = await ActivitySessionToken.find({ assignmentId: ASSIGNMENT_ID });
    fail('ActivitySessionToken en estado "used" encontrado', 'Tokens: ' + allTokens.length + ' — statuses: ' + allTokens.map((t) => t.status).join(', '));
    allPassed = false;
  } else {
    pass('ActivitySessionToken en estado "used" encontrado (id: ' + usedTokenDoc._id + ')');
  }

  const docObj = result.toObject();
  const printable = JSON.parse(JSON.stringify(docObj, (key, value) => {
    if (value && typeof value === 'object' && value.toString && /^[a-f0-9]{24}$/.test(value.toString())) {
      return value.toString().slice(0, 8) + '...';
    }
    return value;
  }));
  console.log('\n[verify] === DOCUMENTO ActivityResult (ids truncados) ===');
  console.log(JSON.stringify(printable, null, 2));

  console.log('\n[verify] === VEREDICTO CONTRAPRUEBA MONGO: ' + (allPassed ? 'VERDE' : 'ROJO') + ' ===');

  await mongoose.disconnect();
  process.exit(allPassed ? 0 : 1);
}

verify().catch((err) => {
  console.error('[verify] Error inesperado: ' + err.message);
  process.exit(1);
});
