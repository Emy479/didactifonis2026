const express = require('express');
const { protect } = require('../middleware/auth');
const { getProvider } = require('../payment');
const User = require('../models/User');

const router = express.Router();

router.get('/plans', protect, async (req, res, next) => {
  try {
    const provider = getProvider();
    const plans = await provider.getPlans();
    return res.json(plans);
  } catch (err) {
    return next(err);
  }
});

router.post('/checkout', protect, async (req, res, next) => {
  const { plan } = req.body;
  if (!plan) {
    return res.status(400).json({ message: 'Plan requerido' });
  }
  try {
    const provider = getProvider();
    const plans = await provider.getPlans();
    const selectedPlan = plans.find(p => p.id === plan);
    if (!selectedPlan) {
      return res.status(400).json({ message: 'Plan inválido' });
    }
    const result = await provider.createSession(req.user._id, plan, selectedPlan.price);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

router.post('/confirm', protect, async (req, res, next) => {
  const { token, plan } = req.body;
  if (!token) {
    return res.status(400).json({ message: 'Token requerido' });
  }
  try {
    const provider = getProvider();
    const result = await provider.confirmPayment(token);
    if (!result.success) {
      return res.json({ success: false });
    }

    // Determinar duración del plan para calcular planExpiresAt
    let durationMonths = 1;
    if (plan) {
      const plans = await provider.getPlans();
      const selectedPlan = plans.find(p => p.id === plan);
      if (selectedPlan) durationMonths = selectedPlan.durationMonths;
    }

    const now = new Date();
    const planExpiresAt = new Date(now);
    planExpiresAt.setMonth(planExpiresAt.getMonth() + durationMonths);

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        'subscription.status': 'active',
        'subscription.planStartedAt': now,
        'subscription.planExpiresAt': planExpiresAt,
      },
      { new: true }
    );

    return res.json({
      success: true,
      subscription: {
        status: updatedUser.subscription.status,
        planExpiresAt: updatedUser.subscription.planExpiresAt,
      },
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
