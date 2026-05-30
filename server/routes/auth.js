const { Router } = require('express');
const { register, login, me } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = Router();

// POST /api/auth/register — registro público (tutor / profesional)
router.post('/register', register);

// POST /api/auth/login — inicio de sesión
router.post('/login', login);

// GET /api/auth/me — perfil del usuario autenticado
router.get('/me', protect, me);

module.exports = router;
