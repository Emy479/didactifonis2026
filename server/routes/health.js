const { Router } = require('express');

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV });
});

module.exports = router;
