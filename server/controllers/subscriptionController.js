const getSubscriptionStatus = (req, res) => {
  const user = req.user;
  const { status, trialEndsAt, planExpiresAt } = user.subscription;
  const hasActiveAccess = user.hasActiveAccess();
  const now = new Date();

  let daysRemaining = null;
  if (status === 'trial' && trialEndsAt) {
    const ms = trialEndsAt - now;
    daysRemaining = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  } else if (status === 'active' && planExpiresAt) {
    const ms = planExpiresAt - now;
    daysRemaining = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }

  return res.json({
    status,
    trialEndsAt: trialEndsAt || null,
    planExpiresAt: planExpiresAt || null,
    hasActiveAccess,
    daysRemaining,
  });
};

module.exports = { getSubscriptionStatus };
