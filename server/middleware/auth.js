const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ── Verifica el JWT y adjunta req.user ───────────────────────────────────────
async function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  const token = authHeader.slice(7);

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }

  try {
    const user = await User.findById(payload.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Usuario no encontrado o inactivo' });
    }
    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

// ── Verifica que el usuario tenga uno de los roles indicados ─────────────────
function requireRole(...roles) {
  return function roleGuard(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Sin permiso para este recurso' });
    }
    return next();
  };
}

// ── Verifica que la suscripción del usuario esté activa ──────────────────────
// Debe usarse DESPUÉS de protect().
function requireActiveSubscription(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'No autenticado' });
  }
  if (!req.user.hasActiveAccess()) {
    return res.status(403).json({
      code: 'SUBSCRIPTION_REQUIRED',
      message: 'Suscripción requerida o periodo de prueba vencido',
    });
  }
  return next();
}

module.exports = { protect, requireRole, requireActiveSubscription };
