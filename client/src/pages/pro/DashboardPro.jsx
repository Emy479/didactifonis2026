import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import TrialBanner from '../../components/TrialBanner';
import PacientesPro from './PacientesPro';
import ActividadesPro from './ActividadesPro';
import TerapiasPro from './TerapiasPro';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const NAV_ITEMS = [
  { id: 'inicio',         label: 'Inicio',        icon: '▦' },
  { id: 'pacientes',      label: 'Pacientes',      icon: '👥' },
  { id: 'terapias',       label: 'Terapias',       icon: '🧩' },
  { id: 'actividades',    label: 'Actividades',    icon: '🎮' },
  { id: 'reportes',       label: 'Reportes',       icon: '📊', soon: true },
  { id: 'mensajes',       label: 'Mensajes',       icon: '💬', soon: true },
  { id: 'calendario',     label: 'Calendario',     icon: '📅', soon: true },
  { id: 'recursos',       label: 'Recursos',       icon: '📚', soon: true },
  { id: 'configuracion',  label: 'Configuración',  icon: '⚙️', soon: true },
];

export default function DashboardPro() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [trialInfo, setTrialInfo] = useState({ show: false, daysRemaining: null });
  const [currentView, setCurrentView] = useState('inicio');

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${API_URL}/api/subscription/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'trial' && data.daysRemaining <= 5) {
          setTrialInfo({ show: true, daysRemaining: data.daysRemaining });
        }
      } catch { /* silencioso */ }
    };
    fetchSubscription();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderView = () => {
    switch (currentView) {
      case 'pacientes':   return <PacientesPro />;
      case 'actividades': return <ActividadesPro />;
      case 'terapias':    return <TerapiasPro />;
      default:            return <ProInicio user={user} setCurrentView={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {trialInfo.show && (
        <TrialBanner
          daysRemaining={trialInfo.daysRemaining}
          onActivate={() => navigate('/subscription/checkout')}
        />
      )}

      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-sm flex flex-col flex-shrink-0">
          <div className="px-6 py-5 border-b border-surface">
            <h2 className="font-heading text-xl font-semibold text-primary">Didactifonis</h2>
            <p className="font-body text-xs text-text-soft mt-0.5">Panel Profesional</p>
          </div>

          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                disabled={item.soon}
                onClick={() => !item.soon && setCurrentView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl mb-1 transition text-left ${
                  item.soon
                    ? 'opacity-40 cursor-not-allowed text-text-soft'
                    : currentView === item.id
                    ? 'bg-accent/10 text-accent font-semibold'
                    : 'text-text-soft hover:bg-surface'
                }`}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                <span className="font-body text-sm flex-1">{item.label}</span>
                {item.soon && (
                  <span className="font-body text-xs text-text-soft/60 bg-surface px-1.5 py-0.5 rounded-md">
                    Próximo
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-surface">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent font-heading font-semibold text-sm">
                {user?.name?.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="font-body text-sm font-semibold text-text-strong truncate">{user?.name}</p>
                <p className="font-body text-xs text-text-soft">Profesional</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full bg-surface text-text-soft font-body text-sm rounded-xl px-4 py-2 hover:bg-text-soft/10 transition"
            >
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Contenido */}
        <main className="flex-1 overflow-y-auto">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

// ── Dashboard de inicio del profesional ──────────────────────────────────────
function ProInicio({ user, setCurrentView }) {
  const [patients, setPatients] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);

  const token = localStorage.getItem('auth_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/professional/patients`, { headers }).then((r) => r.ok ? r.json() : []),
      fetch(`${API_URL}/api/activities`, { headers }).then((r) => r.ok ? r.json() : []),
    ]).then(([p, a]) => {
      setPatients(Array.isArray(p) ? p : []);
      setActivities(Array.isArray(a) ? a : []);
    }).catch(() => {}).finally(() => setLoadingPatients(false));
  }, []);

  const actividadesAsignadas = activities.length;
  const objetivosActivos = patients.length;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-semibold text-text-strong">
          Hola, {user?.name}
        </h1>
        <p className="font-body text-sm text-text-soft mt-1">Aquí está el resumen de tu consulta del día</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Pacientes activos" value={patients.length} color="text-primary" />
        <KpiCard label="Actividades en catálogo" value={actividadesAsignadas} color="text-accent" />
        <KpiCard label="Objetivos activos" value={objetivosActivos} color="text-creative" />
        <KpiCard label="Consultas hoy" value="—" color="text-energy" note="Calendario próximamente" />
      </div>

      {/* Pacientes recientes */}
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-heading text-base font-semibold text-text-strong">Mis pacientes</h2>
          <button onClick={() => setCurrentView('pacientes')}
            className="font-body text-sm text-accent hover:underline">
            Ver todos
          </button>
        </div>

        {loadingPatients ? (
          <p className="font-body text-sm text-text-soft">Cargando pacientes...</p>
        ) : patients.length === 0 ? (
          <div className="text-center py-6">
            <p className="font-body text-text-soft mb-2">Aún no tienes pacientes vinculados.</p>
            <p className="font-body text-sm text-text-soft/70">
              Los pacientes se vinculan cuando un tutor acepta tu invitación.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {patients.slice(0, 4).map((p) => (
              <div key={p._id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface transition">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center font-heading font-semibold text-accent text-sm">
                  {p.name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm font-semibold text-text-strong">{p.name}</p>
                  <p className="font-body text-xs text-text-soft">
                    Tutor: {p.tutorId?.name || '—'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-body text-sm font-semibold text-primary">
                    {p.progress?.successRate ?? 0}%
                  </p>
                  <p className="font-body text-xs text-text-soft">progreso</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4">
        <p className="font-body text-sm text-text-strong font-medium mb-1">Funciones próximas</p>
        <p className="font-body text-sm text-text-soft">
          Calendario de citas, mensajería con tutores y reportes de progreso están en desarrollo.
        </p>
      </div>
    </div>
  );
}

function KpiCard({ label, value, color, note }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <p className="font-body text-xs text-text-soft mb-2">{label}</p>
      <p className={`font-heading text-3xl font-semibold ${color}`}>{value}</p>
      {note && <p className="font-body text-xs text-text-soft/60 mt-1">{note}</p>}
    </div>
  );
}
