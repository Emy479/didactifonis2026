import { useNavigate } from 'react-router-dom';
import { useChild } from '../../context/ChildContext';
import { useEffect } from 'react';

// El niño no tiene cuenta propia ni usa AuthContext.
// Accede siempre desde la sesión del tutor.
export default function DashboardNino() {
  const { activeChild, childMode, exitChildMode } = useChild();
  const navigate = useNavigate();

  useEffect(() => {
    // Si no hay modo niño activo, redirigir al tutor
    if (!childMode || !activeChild) {
      navigate('/tutor');
    }
  }, [childMode, activeChild, navigate]);

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

  const activities = [
    { name: 'Espejo mágico', icon: '✨', color: 'from-creative to-accent' },
    { name: 'Encuentra el sonido', icon: '🔍', color: 'from-accent to-primary' },
    { name: 'Palabras locas', icon: '🎪', color: 'from-energy to-optimism' },
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activities.map((activity, idx) => (
              <button
                key={idx}
                className={`bg-gradient-to-br ${activity.color} rounded-2xl p-6 text-white hover:scale-105 transition-transform shadow-lg`}
              >
                <div className="text-5xl mb-4 text-center">{activity.icon}</div>
                <h3 className="font-heading text-lg font-bold text-center mb-2">
                  {activity.name}
                </h3>
                <div className="bg-white/30 rounded-xl py-2 px-4 text-center backdrop-blur-sm">
                  <span className="font-body text-sm font-semibold">¡Jugar ahora!</span>
                </div>
              </button>
            ))}
          </div>

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
