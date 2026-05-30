const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

// ── Subdocumento: estado de suscripción ─────────────────────────────────────
const subscriptionSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['trial', 'active', 'expired', 'none'],
      default: 'none',
    },
    trialEndsAt: { type: Date, default: null },
    planStartedAt: { type: Date, default: null },
    planExpiresAt: { type: Date, default: null },
  },
  { _id: false }
);

// ── Modelo de usuario ────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Formato de email inválido'],
    },
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: [8, 'La contraseña debe tener al menos 8 caracteres'],
      select: false, // no se devuelve por defecto en queries
    },
    role: {
      type: String,
      enum: ['tutor', 'profesional', 'admin'],
      required: true,
    },
    subscription: {
      type: subscriptionSchema,
      default: () => ({ status: 'none' }),
    },
    // Registro de consentimiento (Ley 21.719): quién, cuándo, IP, versión
    consent: {
      acceptedAt: { type: Date, default: null },
      ip: { type: String, default: null },
      version: { type: String, default: null },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Perfil profesional: solo relevante para el rol 'profesional'.
    // Usado en el directorio público (GET /api/professionals/directory).
    professionalProfile: {
      specialty: { type: String, default: null },
      city: { type: String, default: null },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: false },
  }
);

// ── Índice secundario para búsquedas por rol ─────────────────────────────────
userSchema.index({ role: 1 });

// ── Pre-save: hash de contraseña ─────────────────────────────────────────────
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
    return next();
  } catch (err) {
    return next(err);
  }
});

// ── Método: comparar contraseña ──────────────────────────────────────────────
userSchema.methods.comparePassword = async function comparePassword(plain) {
  return bcrypt.compare(plain, this.password);
};

// ── Método: ¿tiene acceso activo? ───────────────────────────────────────────
// El admin siempre tiene acceso.
// En DEMO_MODE (solo fuera de producción) se omite la validación de suscripción.
// El resto requiere status 'trial' o 'active' dentro de su vigencia.
userSchema.methods.hasActiveAccess = function hasActiveAccess() {
  if (this.role === 'admin') return true;

  if (
    process.env.DEMO_MODE === 'true' &&
    process.env.NODE_ENV !== 'production'
  ) {
    return true;
  }

  const { status, trialEndsAt, planExpiresAt } = this.subscription;
  const now = new Date();

  if (status === 'active') {
    return !planExpiresAt || planExpiresAt > now;
  }
  if (status === 'trial') {
    return trialEndsAt != null && trialEndsAt > now;
  }
  return false;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
