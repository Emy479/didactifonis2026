require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');

const app = express();

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rate limiting: 100 requests per 15 minutes per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Routes
app.use('/api', healthRouter);
app.use('/api/auth', authRouter);

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
const ENV = process.env.NODE_ENV || 'development';

// DEMO_MODE solo disponible fuera de produccion
if (process.env.DEMO_MODE === 'true' && ENV === 'production') {
  console.error('DEMO_MODE no puede habilitarse en produccion. Ignorando.');
  process.env.DEMO_MODE = 'false';
}

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT} [${ENV}]`);
});
