import { useNavigate } from 'react-router-dom';

export default function SubscriptionRequired() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-10 text-center max-w-md w-full">
        <div className="flex justify-center mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-14 h-14 text-text-soft"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h1 className="font-heading text-2xl font-semibold text-text-strong mb-2">
          Acceso restringido
        </h1>
        <p className="font-body text-sm text-text-soft mb-8">
          Necesitas una suscripción activa para acceder a esta funcionalidad.
          Activa tu plan y comienza a usar la plataforma completa.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/subscription/checkout')}
            className="bg-primary text-white font-heading font-semibold rounded-xl px-6 py-2.5 hover:opacity-90 transition"
          >
            Activar suscripción
          </button>
          <button
            onClick={() => navigate('/')}
            className="font-body text-sm text-text-soft hover:text-text-strong transition"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
}
