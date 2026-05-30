const PaymentProvider = require('../PaymentProvider');

const PLANS = [
  { id: 'monthly', name: 'Mensual', price: 4990, currency: 'CLP', durationMonths: 1 },
  { id: 'annual',  name: 'Anual',   price: 39990, currency: 'CLP', durationMonths: 12 },
];

function assertNotProduction() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('MockProvider no disponible en producción');
  }
}

class MockProvider extends PaymentProvider {
  constructor() {
    super();
    assertNotProduction();
  }

  async getPlans() {
    assertNotProduction();
    return PLANS;
  }

  async createSession(userId, plan, amount) {
    assertNotProduction();
    const token = 'MOCK_TOKEN_' + Date.now();
    return {
      redirectUrl: '/subscription/mock-confirm?token=' + token,
      token,
    };
  }

  async confirmPayment(token) {
    assertNotProduction();
    if (token && token.startsWith('MOCK_TOKEN_')) {
      return { success: true, transactionId: 'MOCK_TXN_' + Date.now(), amount: 0 };
    }
    return { success: false, transactionId: null, amount: 0 };
  }
}

module.exports = MockProvider;
