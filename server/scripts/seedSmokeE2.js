/**
 * seedSmokeE2.js — Crea los datos mínimos para el smoke manual del flujo
 * niño → "¡Jugar ahora!" → stub SDK → resultado en Progreso (E2 Frente A).
 * Cuelga todo de la cuenta demo-tutor (ejecutar antes seedDemo.js).
 * SOLO se puede ejecutar fuera de NODE_ENV=production.
 *
 * Uso: npm run seed:smoke-e2
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../models/User');
const Child = require('../models/Child');
const Activity = require('../models/Activity');
const Assignment = require('../models/Assignment');

if (process.env.NODE_ENV === 'production') {
  console.error('[seed] ERROR: Este script no puede ejecutarse en produccion.');
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('[seed] ERROR: MONGODB_URI no definida en .env');
  process.exit(1);
}

const TUTOR_EMAIL = 'demo-tutor@didactifonis.dev';
const ADMIN_EMAIL = 'demo-admin@didactifonis.dev';
const CHILD_NAME = 'Demo Niño';
const ACTIVITY_TITLE = 'Smoke E2 — Actividad de prueba (stub)';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('[seed] Conectado a MongoDB');

  const tutor = await User.findOne({ email: TUTOR_EMAIL });
  const admin = await User.findOne({ email: ADMIN_EMAIL });
  if (!tutor || !admin) {
    console.error('[seed] ERROR: faltan cuentas demo. Ejecuta antes: npm run seed:demo');
    process.exit(1);
  }

  let child = await Child.findOne({ tutorId: tutor._id, name: CHILD_NAME });
  if (!child) {
    child = await Child.create({ tutorId: tutor._id, name: CHILD_NAME });
    console.log(`  [creado] Child "${CHILD_NAME}" (${child._id})`);
  } else {
    console.log(`  [existente] Child "${CHILD_NAME}" (${child._id})`);
  }

  let activity = await Activity.findOne({ title: ACTIVITY_TITLE });
  if (!activity) {
    activity = await Activity.create({
      title: ACTIVITY_TITLE,
      type: 'otro',
      therapeuticGoal: 'Validar protocolo postMessage host↔juego con el stub de desarrollo',
      difficultyLevel: 1,
      availableToTutors: true,
      // bundleUrl null a propósito: en dev GameHost cae al stub /__dev-stubs/sdk-stub.html
      bundleUrl: null,
      passThreshold: 60,
      createdBy: admin._id,
    });
    console.log(`  [creado] Activity "${ACTIVITY_TITLE}" (${activity._id})`);
  } else {
    console.log(`  [existente] Activity "${ACTIVITY_TITLE}" (${activity._id})`);
  }

  let assignment = await Assignment.findOne({
    activityId: activity._id,
    childId: child._id,
    status: 'pending',
  });
  if (!assignment) {
    assignment = await Assignment.create({
      activityId: activity._id,
      childId: child._id,
      assignedBy: tutor._id,
      assignedByRole: 'tutor',
    });
    console.log(`  [creado] Assignment pendiente (${assignment._id})`);
  } else {
    console.log(`  [existente] Assignment pendiente (${assignment._id})`);
  }

  await mongoose.disconnect();
  console.log('[seed] Completado. Login: demo-tutor@didactifonis.dev / Demo1234!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] Error inesperado:', err.message);
  process.exit(1);
});
