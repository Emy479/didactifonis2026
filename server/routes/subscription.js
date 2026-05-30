const express = require('express');
const { protect } = require('../middleware/auth');
const { getSubscriptionStatus } = require('../controllers/subscriptionController');

const router = express.Router();

router.get('/status', protect, getSubscriptionStatus);

module.exports = router;
