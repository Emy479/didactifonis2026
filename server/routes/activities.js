const path = require('path');
const fs = require('fs');
const { Router } = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const Activity = require('../models/Activity');
const { protect, requireRole, requireActiveSubscription } = require('../middleware/auth');
const storage = require('../storage');
const { extractZipToDir, loadAndValidateManifest, BundleError } = require('../activities/bundleArchive');

// M4: rate-limit dedicado para endpoints de upload de bundles.
// El global (100/15min) es demasiado permisivo para subidas de archivos grandes.
// 20 subidas por IP cada 15 minutos es suficiente para un admin real y frena DoS
// por subidas repetidas que agoten CPU/disco con extracción de ZIPs.
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiadas subidas. Intenta nuevamente en 15 minutos.' },
});

const router = Router();

const upload = multer({
  dest: path.join(require('os').tmpdir(), 'didactifonis-uploads'),
  limits: { fileSize: Number(process.env.BUNDLE_MAX_ZIP_BYTES) || 50 * 1024 * 1024 },
});

const BUNDLE_LIMITS = {
  maxFiles: Number(process.env.BUNDLE_MAX_FILES) || 2000,
  maxFileBytes: Number(process.env.BUNDLE_MAX_FILE_BYTES) || 50 * 1024 * 1024,
  maxTotalBytes: Number(process.env.BUNDLE_MAX_TOTAL_BYTES) || 200 * 1024 * 1024,
};

const ACTIVITY_TYPES = ['fonema', 'silaba', 'palabra', 'comprension', 'otro'];

// Valida los campos terapéuticos que aporta el Admin en el multipart.
// Devuelve { ok: true, value } o { ok: false, message }.
function parseAdminFields(body) {
  const { type, difficultyLevel, therapeuticGoal, availableToTutors, passThreshold } = body;
  if (!ACTIVITY_TYPES.includes(type)) {
    return { ok: false, message: 'Tipo de actividad inválido.' };
  }
  const lvl = Number(difficultyLevel);
  if (![1, 2, 3].includes(lvl)) {
    return { ok: false, message: 'El nivel de dificultad debe ser 1, 2 o 3.' };
  }
  let threshold = 60;
  if (passThreshold !== undefined && passThreshold !== '') {
    threshold = Number(passThreshold);
    if (Number.isNaN(threshold) || threshold < 0 || threshold > 100) {
      return { ok: false, message: 'El umbral de aprobación debe estar entre 0 y 100.' };
    }
  }
  return {
    ok: true,
    value: {
      type,
      difficultyLevel: lvl,
      therapeuticGoal: therapeuticGoal || null,
      availableToTutors: availableToTutors === 'true' || availableToTutors === true,
      passThreshold: threshold,
    },
  };
}

// GET / — lista actividades según rol
router.get('/', protect, requireActiveSubscription, async (req, res, next) => {
  try {
    const { type, difficultyLevel } = req.query;
    const filter = { isActive: true };

    if (req.user.role === 'tutor') {
      filter.availableToTutors = true;
    }
    if (type) filter.type = type;
    if (difficultyLevel) filter.difficultyLevel = Number(difficultyLevel);

    const activities = await Activity.find(filter).sort({ difficultyLevel: 1 });
    return res.json(activities);
  } catch (err) {
    return next(err);
  }
});

// GET /:id — detalle de actividad
router.get('/:id', protect, requireActiveSubscription, async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.id);

    if (!activity || !activity.isActive) {
      return res.status(404).json({ message: 'Actividad no encontrada' });
    }

    if (req.user.role === 'tutor' && !activity.availableToTutors) {
      return res.status(403).json({ message: 'Sin permiso para este recurso' });
    }

    return res.json(activity);
  } catch (err) {
    return next(err);
  }
});

// POST / — crear actividad (solo admin)
router.post('/', protect, requireRole('admin'), async (req, res, next) => {
  try {
    const {
      title,
      type,
      therapeuticGoal,
      difficultyLevel,
      ageRange,
      durationMinutes,
      availableToTutors,
      thumbnailUrl,
      bundleUrl,
    } = req.body;

    const activity = await Activity.create({
      title,
      type,
      therapeuticGoal,
      difficultyLevel,
      ageRange,
      durationMinutes,
      availableToTutors,
      thumbnailUrl,
      bundleUrl,
      createdBy: req.user._id,
    });

    return res.status(201).json(activity);
  } catch (err) {
    return next(err);
  }
});

// PUT /:id — actualizar actividad (solo admin)
router.put('/:id', protect, requireRole('admin'), async (req, res, next) => {
  try {
    const { createdBy, ...updateData } = req.body;

    const activity = await Activity.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!activity) {
      return res.status(404).json({ message: 'Actividad no encontrada' });
    }

    return res.json(activity);
  } catch (err) {
    return next(err);
  }
});

// POST /upload — subir bundle ZIP y crear actividad (solo admin)
router.post('/upload', uploadLimiter, protect, requireRole('admin'), upload.single('bundle'), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Falta el archivo bundle (.zip).' });
  }
  const admin = parseAdminFields(req.body);
  if (!admin.ok) {
    fs.rmSync(req.file.path, { force: true });
    return res.status(400).json({ message: admin.message });
  }

  const activityId = new mongoose.Types.ObjectId();
  const tempDir = path.join(storage.root(), `.tmp-${activityId}`);

  try {
    await extractZipToDir(req.file.path, tempDir, BUNDLE_LIMITS);
    const manifest = loadAndValidateManifest(tempDir);

    storage.save(activityId, tempDir); // mueve tempDir -> baseDir/<activityId>

    const activity = await Activity.create({
      _id: activityId,
      title: manifest.title,
      type: admin.value.type,
      difficultyLevel: admin.value.difficultyLevel,
      therapeuticGoal: admin.value.therapeuticGoal,
      ageRange: { min: manifest.ageMin, max: manifest.ageMax },
      durationMinutes: manifest.durationMin,
      availableToTutors: admin.value.availableToTutors,
      passThreshold: admin.value.passThreshold,
      gameId: manifest.id,
      gameVersion: manifest.version,
      entryPoint: manifest.entryPoint,
      bundlePath: String(activityId),
      manifest,
      bundleUrl: storage.serveUrl(activityId, manifest.entryPoint),
      createdBy: req.user._id,
    });

    return res.status(201).json(activity);
  } catch (err) {
    storage.delete(activityId); // limpia la carpeta committeada si Activity.create falló
    if (err instanceof BundleError) {
      if (err.code === 'ZIP_SLIP' || err.code === 'SYMLINK') {
        console.warn(`[seguridad] bundle rechazado (${err.code}) admin=${req.user._id}: ${err.message}`);
      }
      return res.status(err.httpStatus).json({ message: err.message, details: err.details || undefined });
    }
    return next(err);
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { /* ya movido */ }
    try { fs.rmSync(req.file.path, { force: true }); } catch { /* ya borrado */ }
  }
});

// PUT /:id/bundle — reemplazar el bundle de una actividad existente (solo admin)
router.put('/:id/bundle', uploadLimiter, protect, requireRole('admin'), upload.single('bundle'), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Falta el archivo bundle (.zip).' });
  }
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    fs.rmSync(req.file.path, { force: true });
    return res.status(400).json({ message: 'ID de actividad inválido.' });
  }

  const activity = await Activity.findById(req.params.id);
  if (!activity) {
    fs.rmSync(req.file.path, { force: true });
    return res.status(404).json({ message: 'Actividad no encontrada.' });
  }

  const tempDir = path.join(storage.root(), `.tmp-${req.params.id}-${Date.now()}`);

  try {
    await extractZipToDir(req.file.path, tempDir, BUNDLE_LIMITS);
    const manifest = loadAndValidateManifest(tempDir);

    if (activity.gameId && manifest.id !== activity.gameId) {
      throw new BundleError(
        'GAMEID_MISMATCH',
        400,
        `El juego subido (${manifest.id}) no coincide con el de esta actividad (${activity.gameId}).`
      );
    }

    storage.replace(req.params.id, tempDir); // swap atómico con rollback

    activity.gameVersion = manifest.version;
    activity.entryPoint = manifest.entryPoint;
    activity.manifest = manifest;
    activity.bundleUrl = storage.serveUrl(req.params.id, manifest.entryPoint);
    if (!activity.gameId) activity.gameId = manifest.id;
    await activity.save();

    return res.status(200).json(activity);
  } catch (err) {
    if (err instanceof BundleError) {
      if (err.code === 'ZIP_SLIP' || err.code === 'SYMLINK') {
        console.warn(`[seguridad] re-subida rechazada (${err.code}) admin=${req.user._id} actividad=${req.params.id}: ${err.message}`);
      }
      return res.status(err.httpStatus).json({ message: err.message, details: err.details || undefined });
    }
    return next(err);
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { /* ya movido */ }
    try { fs.rmSync(req.file.path, { force: true }); } catch { /* ya borrado */ }
  }
});

module.exports = router;
