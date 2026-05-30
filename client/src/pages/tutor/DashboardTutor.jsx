import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function DashboardTutor() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-10 text-center max-w-sm w-full">
        <h1 className="font-heading text-2xl font-semibold text-text-strong mb-1">
          Bienvenido/a, {user?.name}
        </h1>
        <p className="font-body text-sm text-text-soft mb-8">
          Panel Tutor
        </p>
        <button
          onClick={handleLogout}
          className="bg-accent text-white font-heading font-semibold rounded-xl px-6 py-2.5 hover:opacity-90 transition"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
