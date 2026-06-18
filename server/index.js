require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const subscriptionRouter = require('./routes/subscription');
const paymentRouter = require('./routes/payment');
const childrenRouter = require('./routes/children');
const resultsRouter = require('./activities/resultsRouter');
const sessionsRouter = require('./activities/sessionsRouter');
const activitiesRouter = require('./routes/activities');
const assignmentsRouter = require('./routes/assignments');
const adminRouter = require('./routes/admin');
const professionalRouter = require('./routes/professional');
const progressRouter = require('./routes/progress');
const linkRouter = require('./routes/link');
const directoryRouter = require('./routes/directory');
const messagesRouter = require('./routes/messages');
const gameStorage = require('./storage');

const app = express();

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [],
  credentials: true,
}));

// ALTO-2: el endpoint /api/activities/results requiere un payload de hasta 256kb
// (score + hasta EVENTS_INGEST_CAP eventos). Se monta su parser de 256kb ANTES
// del parser global de 10kb para garantizar que sea el primero en procesar el body
// en esa ruta. Express ejecuta middlewares en orden de registro; si el global de
// 10kb se montara antes, rechazaría payloads de results antes de llegar al router.
// BAJO-1: orden explícito sessions → results → activitiesGenérico en la cadena de
// rutas para que Express no capture las rutas específicas con el prefijo genérico.
app.use('/api/activities/results', express.json({ limit: '256kb' }));

// ALTO-2: límite global reducido a 10kb. Aplica a todos los endpoints EXCEPTO
// /api/activities/results, cuyo body ya fue parseado por el middleware anterior.
// El endpoint /api/activities/sessions no necesita más de ~2kb (solo assignmentId).
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// Rate limiting global: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Rate limiting estricto para endpoints de autenticación: 20 requests per 15 minutes per IP
// Protege contra fuerza bruta en /login y /register.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos. Intenta nuevamente en 15 minutos.' },
});

// Routes
app.use('/api', healthRouter);
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/subscription', subscriptionRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/children', childrenRouter);
// BAJO-1: sessions → results → activitiesGenérico. Rutas específicas primero.
app.use('/api/activities/sessions', sessionsRouter);
app.use('/api/activities/results', resultsRouter);
app.use('/api/activities', activitiesRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/professional', professionalRouter);
app.use('/api/progress', progressRouter);
app.use('/api/link', linkRouter);
app.use('/api/professionals', directoryRouter);
app.use('/api/messages', messagesRouter);

// MongoDB connection — non-fatal: app stays up even if DB is unavailable
const mongoUri = process.env.MONGODB_URI;
if (mongoUri) {
  mongoose.connect(mongoUri)
    .then(() => console.log('MongoDB conectado'))
    .catch((err) => console.error('MongoDB no disponible:', err.message));
} else {
  console.warn('MONGODB_URI no definida — servidor iniciado sin base de datos');
}

const PORT = process.env.PORT || 3001;
const GAME_PUBLIC_PORT = process.env.GAME_PUBLIC_PORT || 3002;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const ENV = process.env.NODE_ENV || 'development';

// BAJO-2: validar API_BASE_URL al arranque.
// Variable obligatoria en staging/producción para construir resultsEndpoint en el
// payload 2.A (contrato de arranque). En development se tolera la ausencia pero se
// advierte: el juego recibirá una URL relativa ("/api/activities/results") que puede
// no ser válida fuera de un entorno con proxy configurado.
const apiBaseUrl = process.env.API_BASE_URL;
if (!apiBaseUrl || !/^https?:\/\/.+/.test(apiBaseUrl)) {
  if (ENV === 'production') {
    console.error(
      '[CONFIG] FATAL: API_BASE_URL no definida o no es una URL absoluta. ' +
      'El contrato de arranque 2.A emitirá resultsEndpoint inválido. ' +
      'Define API_BASE_URL=https://tu-dominio.com en las variables de entorno.'
    );
  } else {
    console.warn(
      '[CONFIG] ADVERTENCIA: API_BASE_URL no definida o no es URL absoluta. ' +
      'resultsEndpoint en el payload 2.A será relativo. ' +
      'Esto es aceptable en desarrollo local con proxy, pero debe configurarse en staging/producción.'
    );
  }
}

// DEMO_MODE solo disponible fuera de produccion
if (process.env.DEMO_MODE === 'true' && ENV === 'production') {
  console.error('DEMO_MODE no puede habilitarse en produccion. Ignorando.');
  process.env.DEMO_MODE = 'false';
}

// ── Error handler global ─────────────────────────────────────────────────────
// Captura cualquier error enviado con next(err) desde rutas y controladores.
// Devuelve siempre { message } en JSON, nunca HTML ni stack trace en producción.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const isDev = ENV !== 'production';
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  if (isDev) {
    console.error('[ERROR]', status, message, err.stack);
  } else {
    console.error('[ERROR]', status, message);
  }

  return res.status(status).json({ message });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT} [${ENV}]`);
});

// ── Servidor dedicado de bundles de juego (A1: origen separado del de la API) ──
// Los bundles HTML/JS son contenido externo no confiable. Servirlos desde un
// origen propio (GAME_PUBLIC_PORT) los aísla del origen de la API y evita que
// scripts del juego puedan acceder a cookies/auth del origen API.
// En producción GAME_PUBLIC_PORT corre detrás de un reverse-proxy que lo expone
// como https://juegos.<dominio> (GAME_PUBLIC_ORIGIN).
const gameApp = express();

gameApp.use(
  '/games',
  (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    // A2: frame-ancestors acotado al origen del cliente, no wildcard.
    res.setHeader(
      'Content-Security-Policy',
      `default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; frame-ancestors ${CLIENT_ORIGIN}`
    );
    next();
  },
  express.static(gameStorage.root(), { index: false, dotfiles: 'deny' })
);

gameApp.listen(GAME_PUBLIC_PORT, () => {
  console.log(`Bundles de juego servidos en puerto ${GAME_PUBLIC_PORT} (origen dedicado)`);
});
