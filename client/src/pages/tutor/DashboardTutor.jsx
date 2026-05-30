import { useState, useEffect } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useChild } from '../../context/ChildContext';
import TrialBanner from '../../components/TrialBanner';
import MiHijoa from './MiHijoa';
import ActividadesTutor from './ActividadesTutor';
import TareasTutor from './TareasTutor';
import ProgresoTutor from './ProgresoTutor';
import LogrosTutor from './LogrosTutor';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function DashboardTutor() {
  const { user, logout } = useAuth();
  const { children, activeChild, loading, setActiveChild, loadChildren } = useChild();
  const navigate = useNavigate();
  const [trialInfo, setTrialInfo] = useState({ show: false, daysRemaining: null });
  const [showAddChildForm, setShowAddChildForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', birthDate: '', avatarId: 'nino-1' });
  const [currentView, setCurrentView] = useState('inicio');

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

  const handleChildClick = (child) => {
    setActiveChild(child);
    setCurrentView('mi-hijoa');
  };

  const handleAddChild = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/children`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Error al crear niño');
      await loadChildren();
      setShowAddChildForm(false);
      setFormData({ name: '', birthDate: '', avatarId: 'nino-1' });
    } catch (error) {
      console.error('Error creando niño:', error);
      alert('Error al crear el niño. Por favor intenta de nuevo.');
    }
  };

  const getAvatarDisplay = (avatarId) => {
    const avatarMap = {
      'nino-1': { emoji: '👦', bg: 'bg-accent', label: 'Niño 1' },
      'nino-2': { emoji: '🧒', bg: 'bg-primary', label: 'Niño 2' },
      'nina-1': { emoji: '👧', bg: 'bg-creative', label: 'Niña 1' },
      'nina-2': { emoji: '🧑', bg: 'bg-optimism', label: 'Niña 2' },
    };
    return avatarMap[avatarId] || { emoji: '👤', bg: 'bg-surface', label: 'Otro' };
  };

  const navItems = [
    { id: 'inicio', label: 'Inicio', icon: '🏠' },
    { id: 'mis-hijos', label: 'Mis hijos', icon: '👨‍👩‍👧‍👦' },
    { id: 'actividades', label: 'Actividades', icon: '🎯' },
    { id: 'tareas', label: 'Tareas', icon: '✓' },
    { id: 'progreso', label: 'Progreso', icon: '📊' },
    { id: 'logros', label: 'Logros', icon: '🏆' },
    { id: 'mensajes', label: 'Mensajes', icon: '💬' },
    { id: 'calendario', label: 'Calendario', icon: '📅' },
    { id: 'recursos', label: 'Recursos', icon: '📚' },
    { id: 'configuracion', label: 'Configuración', icon: '⚙️' },
  ];

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
        <aside className="w-64 bg-white shadow-sm flex flex-col">
          <div className="p-6">
            <h2 className="font-heading text-xl font-semibold text-primary">Didactifonis</h2>
          </div>

          <nav className="flex-1 px-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-2 transition ${
                  currentView === item.id
                    ? 'bg-accent/10 text-accent font-semibold'
                    : 'text-text-soft hover:bg-surface'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-body text-sm">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 border-t">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-heading font-semibold">
                {user?.name?.charAt(0)}
              </div>
              <div>
                <p className="font-body text-sm font-semibold text-text-strong">{user?.name}</p>
                <p className="font-body text-xs text-text-soft">Tutor</p>
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

        {/* Contenido principal */}
        <main className="flex-1 overflow-hidden">
          {currentView === 'mi-hijoa' ? (
            <MiHijoa />
          ) : currentView === 'actividades' ? (
            <ActividadesTutor selectedChildId={activeChild?._id || null} />
          ) : currentView === 'tareas' ? (
            <TareasTutor selectedChildId={activeChild?._id || null} />
          ) : currentView === 'progreso' ? (
            <ProgresoTutor />
          ) : currentView === 'logros' ? (
            <LogrosTutor />
          ) : currentView === 'mis-hijos' || currentView === 'inicio' ? (
            <div className="h-full overflow-y-auto p-8">
              <h1 className="font-heading text-3xl font-semibold text-text-strong mb-6">
                {currentView === 'inicio' ? '¡Hola, ' + user?.name + '!' : 'Mis hijos'}
              </h1>

              {loading ? (
                <p className="font-body text-text-soft">Cargando...</p>
              ) : children.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center max-w-md mx-auto">
                  <p className="font-body text-text-soft mb-6">
                    Aún no has agregado ningún niño. Comienza creando el perfil de tu hijo/a.
                  </p>
                  <button
                    onClick={() => setShowAddChildForm(true)}
                    className="bg-accent text-white font-heading font-semibold rounded-xl px-6 py-3 hover:opacity-90 transition"
                  >
                    + Agregar niño/a
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <p className="font-body text-text-soft">{children.length} niño{children.length !== 1 ? 's' : ''} registrado{children.length !== 1 ? 's' : ''}</p>
                    <button
                      onClick={() => setShowAddChildForm(true)}
                      className="bg-accent text-white font-heading font-semibold rounded-xl px-4 py-2 hover:opacity-90 transition text-sm"
                    >
                      + Agregar niño/a
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {children.map((child) => {
                      const avatar = getAvatarDisplay(child.avatarId);
                      return (
                        <button
                          key={child._id}
                          onClick={() => handleChildClick(child)}
                          className="bg-white rounded-2xl p-6 hover:shadow-lg transition text-left"
                        >
                          <div className="flex items-center gap-4 mb-4">
                            <div className={`w-16 h-16 rounded-full ${avatar.bg} flex items-center justify-center text-3xl`}>
                              {avatar.emoji}
                            </div>
                            <div>
                              <h3 className="font-heading text-lg font-semibold text-text-strong">{child.name}</h3>
                              <p className="font-body text-sm text-text-soft">{avatar.label}</p>
                            </div>
                          </div>
                          <p className="font-body text-sm text-accent">Ver perfil →</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="font-body text-text-soft">Sección en desarrollo: {currentView}</p>
            </div>
          )}
        </main>
      </div>

      {/* Modal Agregar niño */}
      {showAddChildForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h2 className="font-heading text-2xl font-semibold text-text-strong mb-6">Agregar niño/a</h2>
            <form onSubmit={handleAddChild}>
              <div className="mb-4">
                <label className="font-body text-sm font-medium text-text-strong block mb-2">
                  Nombre completo
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-text-soft/20 rounded-xl px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="Ej: Sofía Rodríguez"
                />
              </div>

              <div className="mb-4">
                <label className="font-body text-sm font-medium text-text-strong block mb-2">
                  Fecha de nacimiento
                </label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full border border-text-soft/20 rounded-xl px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="mb-6">
                <label className="font-body text-sm font-medium text-text-strong block mb-3">
                  Elige un avatar
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {['nino-1', 'nino-2', 'nina-1', 'nina-2'].map((avatarId) => {
                    const avatar = getAvatarDisplay(avatarId);
                    return (
                      <button
                        key={avatarId}
                        type="button"
                        onClick={() => setFormData({ ...formData, avatarId })}
                        className={`aspect-square rounded-xl ${avatar.bg} flex items-center justify-center text-3xl transition ${
                          formData.avatarId === avatarId
                            ? 'ring-4 ring-accent scale-105'
                            : 'opacity-50 hover:opacity-75'
                        }`}
                      >
                        {avatar.emoji}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddChildForm(false);
                    setFormData({ name: '', birthDate: '', avatarId: 'nino-1' });
                  }}
                  className="flex-1 bg-surface text-text-strong font-heading font-semibold rounded-xl px-6 py-3 hover:bg-text-soft/10 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-accent text-white font-heading font-semibold rounded-xl px-6 py-3 hover:opacity-90 transition"
                >
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
