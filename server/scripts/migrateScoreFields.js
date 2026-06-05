/**
 * migrateScoreFields.js — Migración E0: score → rawScore/maxScore/scorePercent
 *
 * Contexto: El campo `score` (Number 0–100) fue eliminado del modelo ActivityResult en E0.
 * Los documentos existentes que lo tengan se migran a los campos nuevos usando la
 * equivalencia segura: el rango antiguo ya era 0–100, por lo tanto scorePercent = score.
 *
 * Idempotencia: el filtro solo selecciona documentos que TENGAN score y NO tengan
 * scorePercent ya asignado, por lo que re-ejecutar el script es seguro.
 *
 * No-op seguro: si no hay documentos con `score`, el script termina sin errores.
 *
 * Uso: node scripts/migrateScoreFields.js
 *      (o: npm run migrate:score-fields — añadir al package.json si se desea)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('[migrate] ERROR: MONGODB_URI no definida en .env');
  process.exit(1);
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('[migrate] Conectado a MongoDB.');

  const collection = mongoose.connection.collection('activityresults');

  // Contar documentos candidatos (tienen score, no tienen scorePercent asignado)
  const candidatos = await collection.countDocuments({
    score: { $exists: true, $ne: null },
    scorePercent: { $in: [null, undefined] },
  });

  if (candidatos === 0) {
    console.log('[migrate] No hay documentos con score antiguo. No-op seguro. Migración completa.');
    await mongoose.disconnect();
    return;
  }

  console.log(`[migrate] Documentos a migrar: ${candidatos}`);

  // Migración: score (0–100) → scorePercent = rawScore = score; maxScore = 100
  const resultado = await collection.updateMany(
    {
      score: { $exists: true, $ne: null },
      scorePercent: { $in: [null, undefined] },
    },
    [
      {
        $set: {
          scorePercent: '$score',
          rawScore: '$score',
          maxScore: 100,
        },
      },
      {
        $unset: 'score',
      },
    ]
  );

  console.log(`[migrate] Documentos modificados: ${resultado.modifiedCount}`);

  // Segunda pasada: eliminar el campo score de documentos que ya tenían scorePercent
  // pero aún conservan score (por ejecuciones parciales anteriores)
  const conScoreResidual = await collection.countDocuments({
    score: { $exists: true },
  });

  if (conScoreResidual > 0) {
    console.log(`[migrate] Limpieza residual: ${conScoreResidual} documentos con score aún presente.`);
    await collection.updateMany(
      { score: { $exists: true } },
      { $unset: { score: '' } }
    );
    console.log('[migrate] Limpieza residual completada.');
  }

  console.log('[migrate] Migración completada exitosamente.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('[migrate] ERROR:', err.message);
  process.exit(1);
});
