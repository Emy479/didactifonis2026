const { Router } = require('express');
const {
  createChild,
  getChildren,
  getChild,
  updateChild,
  deleteChild,
} = require('../controllers/childController');
const { protect, requireRole, requireActiveSubscription } = require('../middleware/auth');

const router = Router();

// Todos los endpoints requieren autenticación, rol 'tutor' y suscripción activa
router.post(
  '/',
  protect,
  requireRole('tutor'),
  requireActiveSubscription,
  createChild
);

router.get(
  '/',
  protect,
  requireRole('tutor'),
  requireActiveSubscription,
  getChildren
);

router.get(
  '/:id',
  protect,
  requireRole('tutor'),
  requireActiveSubscription,
  getChild
);

router.put(
  '/:id',
  protect,
  requireRole('tutor'),
  requireActiveSubscription,
  updateChild
);

router.delete(
  '/:id',
  protect,
  requireRole('tutor'),
  requireActiveSubscription,
  deleteChild
);

module.exports = router;
