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
const activitiesRouter = require('./routes/activities');
const assignmentsRouter = require('./routes/assignments');
const adminRouter = require('./routes/admin');
const professionalRouter = require('./routes/professional');
const progressRouter = require('./routes/progress');

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
app.use('/api/subscription', subscriptionRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/children', childrenRouter);
app.use('/api/activities/results', resultsRouter);
app.use('/api/activities', activitiesRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/professional', professionalRouter);
app.use('/api/progress', progressRouter);

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
