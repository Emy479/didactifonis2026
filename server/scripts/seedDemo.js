/**
 * seedDemo.js — Crea o actualiza cuentas demo para desarrollo y QA.
 * SOLO se puede ejecutar fuera de NODE_ENV=production.
 *
 * Uso: npm run seed:demo
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../models/User');

if (process.env.NODE_ENV === 'production') {
  console.error('[seed] ERROR: Este script no puede ejecutarse en produccion.');
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('[seed] ERROR: MONGODB_URI no definida en .env');
  process.exit(1);
}

// Suscripcion activa por 10 años a partir de hoy
function activeSuscription() {
  const now = new Date();
  const tenYears = new Date(now);
  tenYears.setFullYear(tenYears.getFullYear() + 10);
  return {
    status: 'active',
    planStartedAt: now,
    planExpiresAt: tenYears,
  };
}

const DEMO_ACCOUNTS = [
  {
    name: 'Demo Tutor',
    email: 'demo-tutor@didactifonis.dev',
    password: 'Demo1234!',
    role: 'tutor',
  },
  {
    name: 'Demo Profesional',
    email: 'demo-profesional@didactifonis.dev',
    password: 'Demo1234!',
    role: 'profesional',
  },
  {
    name: 'Demo Admin',
    email: 'demo-admin@didactifonis.dev',
    password: 'Demo1234!',
    role: 'admin',
  },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('[seed] Conectado a MongoDB');

  const results = [];

  for (const account of DEMO_ACCOUNTS) {
    const existing = await User.findOne({ email: account.email });

    if (existing) {
      // Actualizar subscription y password sin tocar el resto
      existing.subscription = activeSuscription();
      existing.isActive = true;
      // Actualizar password via pre-save hook (requiere set + save)
      existing.password = account.password;
      await existing.save();
      results.push({ action: 'actualizado', email: account.email, role: account.role });
    } else {
      await User.create({
        name: account.name,
        email: account.email,
        password: account.password,
        role: account.role,
        subscription: activeSuscription(),
        consent: {
          acceptedAt: new Date(),
          ip: '127.0.0.1',
          version: 'seed-v1',
        },
      });
      results.push({ action: 'creado', email: account.email, role: account.role });
    }
  }

  console.log('[seed] Resumen:');
  results.forEach(({ action, email, role }) => {
    console.log(`  [${action}] ${email} (${role})`);
  });

  await mongoose.disconnect();
  console.log('[seed] Completado.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] Error inesperado:', err.message);
  process.exit(1);
});
