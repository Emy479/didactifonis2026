import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_URL } from '../../config';

export default function MockConfirm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const plan = sessionStorage.getItem('pending_plan') ?? '';

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const authToken = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/payment/confirm`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + authToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al confirmar el pago');
      if (data.subscription?.planExpiresAt) {
        sessionStorage.setItem('payment_planExpiresAt', data.subscription.planExpiresAt);
      }
      sessionStorage.removeItem('pending_plan');
      navigate('/subscription/success');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-10 max-w-md w-full">
        <h1 className="font-heading text-xl font-semibold text-text-strong mb-3">
          Confirmar pago de prueba
        </h1>

        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-6">
          <p className="font-body text-sm text-orange-700">
            Entorno de simulación — no se realizará ningún cobro real.
          </p>
        </div>

        <div className="space-y-2 mb-8">
          <div>
            <p className="font-body text-xs text-text-soft uppercase tracking-wide mb-0.5">Token</p>
            <p className="font-body text-sm text-text-strong font-mono break-all">
              {token ? `${token.slice(0, 20)}…` : '—'}
            </p>
          </div>
          {plan && (
            <div>
              <p className="font-body text-xs text-text-soft uppercase tracking-wide mb-0.5">Plan</p>
              <p className="font-body text-sm text-text-strong">{plan}</p>
            </div>
          )}
        </div>

        {error && (
          <p className="font-body text-sm text-red-600 mb-4">{error}</p>
        )}

        <button
          onClick={handleConfirm}
          disabled={submitting}
          className="w-full bg-primary text-white font-heading font-semibold rounded-xl px-6 py-2.5 hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? 'Procesando...' : 'Confirmar pago'}
        </button>
      </div>
    </div>
  );
}
