import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminUsuarios from './AdminUsuarios';
import AdminProfesionales from './AdminProfesionales';
import AdminPadresTutores from './AdminPadresTutores';
import AdminNinos from './AdminNinos';
import AdminActividades from './AdminActividades';
import AdminTerapias from './AdminTerapias';
import AdminSuscripciones from './AdminSuscripciones';
import { API_URL } from '../../config';

const NAV_ITEMS = [
  { id: 'inicio',        label: 'Inicio',           icon: '▦' },
  { id: 'usuarios',      label: 'Usuarios',          icon: '👥' },
  { id: 'profesionales', label: 'Profesionales',     icon: '🩺' },
  { id: 'tutores',       label: 'Padres / Tutores',  icon: '👨‍👩‍👧‍👦' },
  { id: 'ninos',         label: 'Niños',             icon: '🧒' },
  { id: 'actividades',   label: 'Actividades',       icon: '🎮' },
  { id: 'terapias',      label: 'Terapias',          icon: '🧩' },
  { id: 'suscripciones', label: 'Suscripciones',     icon: '💳' },
  { id: 'pagos',         label: 'Pagos',             icon: '💰', soon: true },
  { id: 'reportes',      label: 'Reportes',          icon: '📊', soon: true },
  { id: 'contenido',     label: 'Contenido',         icon: '📁', soon: true },
  { id: 'soporte',       label: 'Soporte',           icon: '🎧', soon: true },
  { id: 'configuracion', label: 'Configuración',     icon: '⚙️', soon: true },
];

export default function DashboardAdmin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('inicio');
  const [stats, setStats] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentView !== 'inicio') return;
    const token = localStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    Promise.all([
      fetch(`${API_URL}/api/admin/stats`, { headers }).then((r) => r.json()),
      fetch(`${API_URL}/api/admin/users?limit=5`, { headers }).then((r) => r.json()),
    ])
      .then(([s, u]) => {
        setStats(s);
        setRecentUsers(u.users || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentView]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderView = () => {
    switch (currentView) {
      case 'usuarios':      return <AdminUsuarios />;
      case 'profesionales': return <AdminProfesionales />;
      case 'tutores':       return <AdminPadresTutores />;
      case 'ninos':         return <AdminNinos />;
      case 'actividades':   return <AdminActividades />;
      case 'terapias':      return <AdminTerapias />;
      case 'suscripciones': return <AdminSuscripciones />;
      default:              return <DashboardInicio stats={stats} recentUsers={recentUsers} loading={loading} />;
    }
  };

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-sm flex flex-col flex-shrink-0">
        <div className="px-6 py-5 border-b border-surface">
          <h2 className="font-heading text-xl font-semibold text-primary">Didactifonis</h2>
          <p className="font-body text-xs text-text-soft mt-0.5">Panel de Administración</p>
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
                  ? 'bg-primary/10 text-primary font-semibold'
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
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-heading font-semibold text-sm">
              {user?.name?.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="font-body text-sm font-semibold text-text-strong truncate">{user?.name}</p>
              <p className="font-body text-xs text-text-soft">Administrador</p>
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
  );
}

// ── Vista de Inicio / Dashboard ──────────────────────────────────────────────
function DashboardInicio({ stats, recentUsers, loading }) {
  const ROL_LABEL = { tutor: 'Tutor', profesional: 'Profesional', admin: 'Admin' };
  const ROL_COLOR = {
    tutor: 'bg-accent/10 text-accent',
    profesional: 'bg-primary/10 text-primary',
    admin: 'bg-creative/10 text-creative',
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-semibold text-text-strong">Dashboard</h1>
        <p className="font-body text-sm text-text-soft mt-1">Resumen general de la plataforma</p>
      </div>

      {loading ? (
        <p className="font-body text-text-soft">Cargando métricas...</p>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard label="Total usuarios" value={stats?.users?.total ?? 0} sub={`${stats?.users?.byRole?.tutor ?? 0} tutores`} color="text-primary" />
            <KpiCard label="Profesionales" value={stats?.users?.byRole?.profesional ?? 0} color="text-accent" />
            <KpiCard label="Actividades activas" value={stats?.activities?.active ?? 0} sub={`de ${stats?.activities?.total ?? 0} totales`} color="text-creative" />
            <KpiCard label="Actividades completadas" value={stats?.assignments?.completed ?? 0} color="text-energy" />
          </div>

          {/* Usuarios recientes */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-heading text-base font-semibold text-text-strong mb-4">Usuarios recientes</h2>
            {recentUsers.length === 0 ? (
              <p className="font-body text-sm text-text-soft">Sin usuarios registrados aún.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left">
                    <th className="font-body text-xs text-text-soft font-medium pb-3">Nombre</th>
                    <th className="font-body text-xs text-text-soft font-medium pb-3">Email</th>
                    <th className="font-body text-xs text-text-soft font-medium pb-3">Rol</th>
                    <th className="font-body text-xs text-text-soft font-medium pb-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface">
                  {recentUsers.map((u) => (
                    <tr key={u._id}>
                      <td className="py-3 font-body text-sm text-text-strong">{u.name}</td>
                      <td className="py-3 font-body text-sm text-text-soft">{u.email}</td>
                      <td className="py-3">
                        <span className={`font-body text-xs px-2.5 py-1 rounded-full font-medium ${ROL_COLOR[u.role] || 'bg-surface text-text-soft'}`}>
                          {ROL_LABEL[u.role] || u.role}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`font-body text-xs px-2.5 py-1 rounded-full ${u.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                          {u.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, color }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <p className="font-body text-xs text-text-soft mb-2">{label}</p>
      <p className={`font-heading text-3xl font-semibold ${color}`}>{value}</p>
      {sub && <p className="font-body text-xs text-text-soft mt-1">{sub}</p>}
    </div>
  );
}
