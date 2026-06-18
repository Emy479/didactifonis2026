const { randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { parseMs, hashToken, generateSecret } = require('./authRefreshHelpers');

// Periodos de prueba (días) por rol
const TRIAL_DAYS = { tutor: 7, profesional: 14 };

const ACCESS_TOKEN_TTL  = process.env.ACCESS_TOKEN_TTL  || '15m';
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || '14d';

// ── Helper: genera token JWT de acceso (stateless, vida corta) ───────────────
function signAccessToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
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

// ── Helper: genera y persiste un refresh token; setea la cookie httpOnly ─────
//
// El token plano tiene forma: <32 bytes aleatorios en hex> (64 chars).
// Se almacena SOLO su SHA-256. Si hay un familyId previo (rotación) se pasa
// como parámetro; en login/register se genera uno nuevo.
//
// Cookie flags (ADR §2.3 / D3):
//   HttpOnly   → no exfiltrable por XSS
//   Secure     → solo HTTPS; condicional a NODE_ENV==='production'
//   SameSite=Strict → mismo sitio en prod (D3)
//   Path=/api/auth  → solo viaja a los endpoints de auth
//   Max-Age    → TTL del refresh en segundos

async function issueRefreshToken(user, req, res, existingFamilyId = null) {
  // Secreto aleatorio de alta entropía (256 bits)
  const secret = generateSecret();

  // Hash SHA-256 para almacenamiento (lookup directo por índice)
  const tokenHash = hashToken(secret);

  const familyId = existingFamilyId || randomUUID();

  const ttlMs = parseMs(REFRESH_TOKEN_TTL);
  const expiresAt = new Date(Date.now() + ttlMs);
  const maxAgeSeconds = Math.floor(ttlMs / 1000);

  await RefreshToken.create({
    userId: user._id,
    tokenHash,
    familyId,
    expiresAt,
    revoked: false,
    revokedAt: null,
    replacedBy: null,
    userAgent: req.get('user-agent') || null,
    ip: req.ip || null,
    lastUsedAt: new Date(),
  });

  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('refresh_token', secret, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'Strict',
    path: '/api/auth',
    maxAge: maxAgeSeconds * 1000, // express espera milisegundos en maxAge
  });

  return tokenHash; // devuelve el hash por si el llamador necesita guardarlo
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

    const accessToken = signAccessToken(user);
    await issueRefreshToken(user, req, res);

    // CAMBIO DE CONTRATO (ADR §2.5): body ahora es { accessToken, user }
    // El campo anterior 'token' queda deprecado. El frontend debe migrar.
    return res.status(201).json({
      accessToken,
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

    const accessToken = signAccessToken(user);
    await issueRefreshToken(user, req, res);

    // CAMBIO DE CONTRATO (ADR §2.5): body ahora es { accessToken, user }
    return res.status(200).json({
      accessToken,
      user: safeUser(user),
    });
  } catch (err) {
    return next(err);
  }
}

// ── POST /api/auth/refresh ───────────────────────────────────────────────────
// Lee la cookie refresh_token, valida, rota y emite nuevo par.
//
// Flujo de validación (ADR §2.4):
//   1. Sin cookie → 401
//   2. Hash no encontrado → 401 (token desconocido o ya purgado por TTL)
//   3. Expirado en campo expiresAt → 401 (raro si el TTL de Mongo actúa, pero
//      puede ocurrir en la ventana de purga; se valida explícitamente)
//   4. Revocado → REUSO DETECTADO → revoca toda la familia → 401
//   5. Válido → rota: marca anterior revocado, emite nuevo doc mismo familyId,
//      setea nueva cookie, responde { accessToken }
async function refresh(req, res, next) {
  try {
    const secret = req.cookies?.refresh_token;

    if (!secret) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const tokenHash = hashToken(secret);

    const tokenDoc = await RefreshToken.findOne({ tokenHash });

    if (!tokenDoc) {
      return res.status(401).json({ message: 'Token de refresco inválido' });
    }

    // Expiración explícita (defensa en profundidad además del TTL de Mongo)
    if (tokenDoc.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Token de refresco expirado' });
    }

    // Detección de reuso: el token ya fue rotado (revocado por una rotación previa).
    // Revoca toda la familia para expulsar tanto al atacante como a la víctima.
    if (tokenDoc.revoked) {
      await RefreshToken.updateMany(
        { familyId: tokenDoc.familyId },
        { $set: { revoked: true, revokedAt: new Date() } }
      );
      // Limpia la cookie del atacante también
      res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        path: '/api/auth',
      });
      return res.status(401).json({ message: 'Sesión revocada por reuso de token' });
    }

    // Carga el usuario
    const user = await User.findById(tokenDoc.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Usuario no encontrado o inactivo' });
    }

    // Rotación: emite el nuevo refresh token (mismo familyId)
    const newHash = await issueRefreshToken(user, req, res, tokenDoc.familyId);

    // Marca el token anterior como revocado y apunta al sucesor
    await RefreshToken.findByIdAndUpdate(tokenDoc._id, {
      revoked: true,
      revokedAt: new Date(),
      replacedBy: newHash,
      lastUsedAt: new Date(),
    });

    const accessToken = signAccessToken(user);

    return res.status(200).json({ accessToken });
  } catch (err) {
    return next(err);
  }
}

// ── POST /api/auth/logout ────────────────────────────────────────────────────
// Revoca el documento de la sesión actual y limpia la cookie.
// Idempotente: si no hay cookie o el token no existe, responde 204 igualmente.
// Solo revoca ESTA sesión (no toda la familia); es logout normal de un dispositivo.
async function logout(req, res, next) {
  try {
    const secret = req.cookies?.refresh_token;

    if (secret) {
      const tokenHash = hashToken(secret);
      await RefreshToken.findOneAndUpdate(
        { tokenHash, revoked: false },
        { $set: { revoked: true, revokedAt: new Date() } }
      );
    }

    // Limpia la cookie independientemente de si el token existía
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      path: '/api/auth',
    });

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
// Requiere protect() aplicado antes.
function me(req, res) {
  return res.status(200).json({ user: safeUser(req.user) });
}

module.exports = { register, login, refresh, logout, me };
