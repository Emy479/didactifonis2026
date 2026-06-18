const { Router } = require('express');
const { register, login, refresh, logout, me } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = Router();

// POST /api/auth/register — registro público (tutor / profesional)
router.post('/register', register);

// POST /api/auth/login — inicio de sesión
router.post('/login', login);

// POST /api/auth/refresh — rota el refresh token y emite nuevo access token
// Lee la cookie httpOnly 'refresh_token'; no requiere body ni Authorization header.
router.post('/refresh', refresh);

// POST /api/auth/logout — revoca la sesión actual y limpia la cookie
// Idempotente: 204 incluso si ya no hay cookie.
router.post('/logout', logout);

// GET /api/auth/me — perfil del usuario autenticado
router.get('/me', protect, me);

module.exports = router;
