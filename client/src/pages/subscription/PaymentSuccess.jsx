import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

const roleRedirect = {
  profesional: '/pro',
  tutor: '/tutor',
  admin: '/admin',
};

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const expiresAt = sessionStorage.getItem('payment_planExpiresAt');
  const formattedDate = formatDate(expiresAt);

  useEffect(() => {
    sessionStorage.removeItem('payment_planExpiresAt');
  }, []);

  const handleGoToDashboard = () => {
    const path = roleRedirect[user?.role] ?? '/';
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-10 text-center max-w-md w-full">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-7 h-7 text-green-600"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        <h1 className="font-heading text-2xl font-semibold text-text-strong mb-2">
          Suscripción activada
        </h1>
        <p className="font-body text-sm text-text-soft mb-4">
          Tu plan está activo. Ya puedes acceder a todas las funcionalidades.
        </p>

        {formattedDate && (
          <p className="font-body text-sm text-text-soft mb-8">
            Válido hasta: <span className="font-semibold text-text-strong">{formattedDate}</span>
          </p>
        )}

        <button
          onClick={handleGoToDashboard}
          className="w-full bg-primary text-white font-heading font-semibold rounded-xl px-6 py-2.5 hover:opacity-90 transition"
        >
          Ir a mi panel
        </button>
      </div>
    </div>
  );
}
