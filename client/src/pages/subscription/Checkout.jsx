import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../../config';

function formatCLP(amount) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
}

export default function Checkout() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${API_URL}/api/payment/plans`, {
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
          },
        });
        if (!res.ok) throw new Error('Error al cargar los planes');
        const json = await res.json();
        setPlans(json.plans ?? json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const handleContinue = async () => {
    if (!selectedPlan) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      sessionStorage.setItem('pending_plan', selectedPlan.id);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/payment/checkout`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan: selectedPlan.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al procesar el pago');
      if (data.redirectUrl) {
        navigate(data.redirectUrl);
      }
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

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
          <p className="font-body text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-accent text-white font-heading font-semibold rounded-xl px-6 py-2.5 hover:opacity-90 transition"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-heading text-2xl font-semibold text-text-strong mb-2 text-center">
          Elige tu plan
        </h1>
        <p className="font-body text-sm text-text-soft text-center mb-10">
          Selecciona el plan que mejor se adapta a tus necesidades.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {plans.map((plan) => {
            const isSelected = selectedPlan?.id === plan.id;
            const isAnnual = plan.durationMonths === 12;
            const monthlyEquivalent = isAnnual ? plan.price / 12 : null;

            return (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan)}
                className={`bg-white rounded-2xl shadow-sm p-6 text-left transition border-2 ${
                  isSelected ? 'border-accent ring-2 ring-accent' : 'border-transparent'
                } hover:shadow-md`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h2 className="font-heading text-lg font-semibold text-text-strong">
                    {plan.name}
                  </h2>
                  {isAnnual && (
                    <span className="bg-accent/10 text-accent font-heading text-xs font-semibold rounded-xl px-2.5 py-1 ml-2 shrink-0">
                      Precio anual
                    </span>
                  )}
                </div>

                <p className="font-heading text-2xl font-bold text-text-strong mb-1">
                  {formatCLP(plan.price)}
                </p>

                {isAnnual && monthlyEquivalent && (
                  <p className="font-body text-xs text-text-soft mb-3">
                    Equivale a {formatCLP(Math.round(monthlyEquivalent))} / mes
                  </p>
                )}

                {plan.description && (
                  <p className="font-body text-sm text-text-soft">{plan.description}</p>
                )}
              </button>
            );
          })}
        </div>

        {submitError && (
          <p className="font-body text-sm text-red-600 text-center mb-4">{submitError}</p>
        )}

        <div className="flex justify-center">
          <button
            onClick={handleContinue}
            disabled={!selectedPlan || submitting}
            className="bg-primary text-white font-heading font-semibold rounded-xl px-8 py-3 hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Procesando...' : 'Continuar al pago'}
          </button>
        </div>
      </div>
    </div>
  );
}
