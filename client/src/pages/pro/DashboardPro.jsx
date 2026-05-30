import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import TrialBanner from '../../components/TrialBanner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function DashboardPro() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [trialInfo, setTrialInfo] = useState({ show: false, daysRemaining: null });

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${API_URL}/api/subscription/status`, {
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'trial' && data.daysRemaining <= 5) {
          setTrialInfo({ show: true, daysRemaining: data.daysRemaining });
        }
      } catch {
        // ignorar silenciosamente
      }
    };
    fetchSubscription();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {trialInfo.show && (
        <TrialBanner
          daysRemaining={trialInfo.daysRemaining}
          onActivate={() => navigate('/subscription/checkout')}
        />
      )}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-md p-10 text-center max-w-sm w-full">
          <h1 className="font-heading text-2xl font-semibold text-text-strong mb-1">
            Bienvenido/a, {user?.name}
          </h1>
          <p className="font-body text-sm text-text-soft mb-8">
            Panel Profesional
          </p>
          <button
            onClick={handleLogout}
            className="bg-accent text-white font-heading font-semibold rounded-xl px-6 py-2.5 hover:opacity-90 transition"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
