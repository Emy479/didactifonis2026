const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Periodos de prueba (días) por rol
const TRIAL_DAYS = { tutor: 7, profesional: 14 };

// ── Helper: genera token JWT ─────────────────────────────────────────────────
function signToken(userId, role) {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// ── Helper: payload seguro (sin contraseña) para la respuesta ────────────────
function safeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    subscription: user.subscription,
    hasActiveAccess: user.hasActiveAccess(),
  };
}

// ── POST /api/auth/register ──────────────────────────────────────────────────
// Solo tutores y profesionales pueden registrarse públicamente.
async function register(req, res, next) {
  try {
    const { name, email, password, role, consentVersion, consentIp } = req.body;

    // Validación de rol permitido
    if (!['tutor', 'profesional'].includes(role)) {
      return res.status(400).json({ message: 'Rol no permitido en el registro público' });
    }

    // Detectar duplicado antes de hashear (unique index también lo haría,
    // pero así podemos devolver un mensaje más claro)
    const exists = await User.findOne({ email: email?.toLowerCase()?.trim() });
    if (exists) {
      return res.status(409).json({ message: 'El email ya está registrado' });
    }

    // Calcular periodo de prueba
    const trialDays = TRIAL_DAYS[role];
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    const user = await User.create({
      name,
      email,
      password,
      role,
      subscription: {
        status: 'trial',
        trialEndsAt,
      },
      consent: {
        acceptedAt: new Date(),
        ip: consentIp || req.ip || null,
        version: consentVersion || null,
      },
    });

    const token = signToken(user._id, user.role);

    return res.status(201).json({
      token,
      user: safeUser(user),
    });
  } catch (err) {
    // Error de validación de Mongoose
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join('. ') });
    }
    return next(err);
  }
}

// ── POST /api/auth/login ─────────────────────────────────────────────────────
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son obligatorios' });
    }

    // Incluir password (select: false en el modelo)
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user || !user.isActive) {
      // Mensaje genérico para no revelar si el email existe
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const passwordOk = await user.comparePassword(password);
    if (!passwordOk) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = signToken(user._id, user.role);

    return res.status(200).json({
      token,
      user: safeUser(user),
    });
  } catch (err) {
    return next(err);
  }
}

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
// Requiere protect() aplicado antes.
function me(req, res) {
  return res.status(200).json({ user: safeUser(req.user) });
}

module.exports = { register, login, me };
