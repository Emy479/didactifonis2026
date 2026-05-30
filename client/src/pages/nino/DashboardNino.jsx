import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChild } from '../../context/ChildContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// El niño no tiene cuenta propia ni usa AuthContext.
// Accede siempre desde la sesión del tutor.
export default function DashboardNino() {
  const { activeChild, childMode, exitChildMode } = useChild();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);

  useEffect(() => {
    // Si no hay modo niño activo, redirigir al tutor
    if (!childMode || !activeChild) {
      navigate('/tutor');
    }
  }, [childMode, activeChild, navigate]);

  useEffect(() => {
    if (!activeChild) return;
    const fetchAssignments = async () => {
      setLoadingAssignments(true);
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(
          `${API_URL}/api/assignments?childId=${activeChild._id}&status=pending`,
          { headers: { Authorization: 'Bearer ' + token } }
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        setAssignments(Array.isArray(data) ? data : []);
      } catch {
        setAssignments([]);
      } finally {
        setLoadingAssignments(false);
      }
    };
    fetchAssignments();
  }, [activeChild]);

  if (!childMode || !activeChild) {
    return null;
  }

  const handleExit = () => {
    exitChildMode();
    navigate('/tutor');
  };

  const getAvatarDisplay = (avatarId) => {
    const avatarMap = {
      'nino-1': '👦',
      'nino-2': '🧒',
      'nina-1': '👧',
      'nina-2': '🧑',
    };
    return avatarMap[avatarId] || '👤';
  };

  const CARD_GRADIENTS = [
    'from-creative to-accent',
    'from-accent to-primary',
    'from-energy to-optimism',
  ];

  return (
    <div className="min-h-screen bg-gradient-creative flex flex-col p-6">
      {/* Header gamificado */}
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-4xl shadow-lg">
            {getAvatarDisplay(activeChild.avatarId)}
          </div>
          <div>
            <h1 className="font-heading text-3xl font-bold text-white drop-shadow-lg">
              ¡Hola, {activeChild.name}!
            </h1>
            <p className="font-body text-white/90">¿Listo para jugar?</p>
          </div>
        </div>

        <button
          onClick={handleExit}
          className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-heading font-semibold rounded-2xl px-6 py-3 transition flex items-center gap-2"
        >
          <span>←</span> Salir
        </button>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 max-w-4xl mx-auto w-full">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
          <h2 className="font-heading text-2xl font-bold text-text-strong mb-6 text-center">
            🎮 Tus actividades
          </h2>

          {loadingAssignments ? (
            <div className="flex items-center justify-center py-12">
              <p className="font-heading text-lg font-semibold text-creative animate-pulse">
                Cargando actividades...
              </p>
            </div>
          ) : assignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <span className="text-7xl select-none">&#11088;</span>
              <p className="font-heading text-xl font-bold text-text-strong text-center">
                ¡Todo listo por hoy!
              </p>
              <p className="font-body text-text-soft text-center">
                Vuelve manana para seguir jugando.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {assignments.map((assignment, idx) => {
                const color = CARD_GRADIENTS[idx % CARD_GRADIENTS.length];
                const title =
                  (assignment.activityId && assignment.activityId.title) ||
                  'Actividad';
                return (
                  <button
                    key={assignment._id}
                    onClick={() => {/* bundleUrl placeholder — no hace nada aun */}}
                    className={`bg-gradient-to-br ${color} rounded-2xl p-6 text-white hover:scale-105 transition-transform shadow-lg`}
                  >
                    <div className="w-14 h-14 bg-white/25 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                      <span className="font-heading text-2xl font-bold text-white">
                        {idx + 1}
                      </span>
                    </div>
                    <h3 className="font-heading text-lg font-bold text-center mb-2">
                      {title}
                    </h3>
                    <div className="bg-white/30 rounded-xl py-2 px-4 text-center backdrop-blur-sm">
                      <span className="font-body text-sm font-semibold">¡Jugar ahora!</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Sección de estrellas/logros */}
          <div className="mt-8 bg-optimism/10 rounded-2xl p-6 border-2 border-optimism/30">
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl">⭐</span>
              <div>
                <p className="font-heading text-lg font-bold text-text-strong">¡Sigue así!</p>
                <p className="font-body text-sm text-text-soft">
                  Has ganado 12 estrellas esta semana
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer decorativo */}
      <footer className="mt-8 text-center">
        <p className="font-body text-white/70 text-sm">
          Recuerda practicar todos los días ✨
        </p>
      </footer>
    </div>
  );
}
