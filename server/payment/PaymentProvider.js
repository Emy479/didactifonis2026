/**
 * Clase base abstracta para proveedores de pago.
 * Todo proveedor concreto debe extender esta clase e implementar sus métodos.
 */
class PaymentProvider {
  /**
   * Crea una sesión de pago y retorna la URL de redirección.
   * @param {string} userId
   * @param {string} plan  — id del plan (ej. 'monthly', 'annual')
   * @param {number} amount — monto en la moneda del proveedor
   * @returns {Promise<{ redirectUrl: string, token: string }>}
   */
  async createSession(userId, plan, amount) {
    throw new Error('Not implemented');
  }

  /**
   * Confirma el resultado de un pago a partir del token devuelto por createSession.
   * @param {string} token
   * @returns {Promise<{ success: boolean, transactionId: string|null, amount: number }>}
   */
  async confirmPayment(token) {
    throw new Error('Not implemented');
  }

  /**
   * Retorna la lista de planes disponibles.
   * @returns {Promise<Array<{ id: string, name: string, price: number, currency: string, durationMonths: number }>>}
   */
  async getPlans() {
    throw new Error('Not implemented');
  }
}

module.exports = PaymentProvider;
