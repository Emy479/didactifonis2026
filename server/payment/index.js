function getProvider() {
  const env = process.env.NODE_ENV || 'development';
  const providerKey = process.env.PAYMENT_PROVIDER;

  if (providerKey === 'mock') {
    if (env === 'production') {
      throw new Error('MockProvider no disponible en producción');
    }
    const MockProvider = require('./providers/MockProvider');
    return new MockProvider();
  }

  if (providerKey === 'transbank') {
    throw new Error('Transbank provider not yet implemented');
  }

  // Sin PAYMENT_PROVIDER configurado: mock en development, error en production
  if (env === 'production') {
    throw new Error('PAYMENT_PROVIDER no configurado para producción');
  }
  const MockProvider = require('./providers/MockProvider');
  return new MockProvider();
}

module.exports = { getProvider };
