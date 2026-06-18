import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../../config';

function StatusBadge({ status }) {
  const configs = {
    trial:   { label: 'Periodo de prueba', classes: 'bg-green-100 text-green-700' },
    active:  { label: 'Activo',            classes: 'bg-green-100 text-green-700' },
    expired: { label: 'Vencido',           classes: 'bg-red-100 text-red-700' },
    none:    { label: 'Sin suscripción',   classes: 'bg-gray-100 text-gray-600' },
  };
  const { label, classes } = configs[status] ?? configs.none;
  return (
    <span className={`inline-block font-heading text-xs font-semibold rounded-xl px-3 py-1 ${classes}`}>
      {label}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function SubscriptionStatus() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/subscription/status`, {
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Error al obtener el estado de suscripción');
      setData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-md p-10 text-center max-w-md w-full">
          <p className="font-body text-sm text-red-600 mb-6">{error}</p>
          <button
            onClick={fetchStatus}
            className="bg-accent text-white font-heading font-semibold rounded-xl px-6 py-2.5 hover:opacity-90 transition"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const { status, daysRemaining, trialEndsAt, planExpiresAt } = data ?? {};

  const ctaLabel = status === 'active' ? 'Ver planes' : status === 'expired' ? 'Renovar suscripción' : 'Activar suscripción';

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-10 max-w-md w-full">
        <h1 className="font-heading text-xl font-semibold text-text-strong mb-4">
          Estado de suscripción
        </h1>

        <div className="mb-6">
          <StatusBadge status={status} />
        </div>

        {status === 'trial' && (
          <div className="space-y-1 mb-8">
            <p className="font-body text-sm text-text-soft">
              Días restantes: <span className="font-semibold text-text-strong">{daysRemaining}</span>
            </p>
            <p className="font-body text-sm text-text-soft">
              Vence el: <span className="font-semibold text-text-strong">{formatDate(trialEndsAt)}</span>
            </p>
          </div>
        )}

        {status === 'active' && (
          <div className="mb-8">
            <p className="font-body text-sm text-text-soft">
              Válido hasta: <span className="font-semibold text-text-strong">{formatDate(planExpiresAt)}</span>
            </p>
          </div>
        )}

        {status === 'expired' && (
          <div className="mb-8">
            <p className="font-body text-sm text-red-600">
              Tu suscripción venció el {formatDate(planExpiresAt)}. Renueva para seguir usando la plataforma.
            </p>
          </div>
        )}

        {status === 'none' && (
          <div className="mb-8">
            <p className="font-body text-sm text-text-soft">
              No tienes una suscripción activa. Activa tu plan para acceder a todas las funcionalidades.
            </p>
          </div>
        )}

        <button
          onClick={() => navigate('/subscription/checkout')}
          className="w-full bg-primary text-white font-heading font-semibold rounded-xl px-6 py-2.5 hover:opacity-90 transition"
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}
