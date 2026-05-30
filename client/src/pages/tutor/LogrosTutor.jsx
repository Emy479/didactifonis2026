import { useState, useEffect } from 'react';
import { useChild } from '../../context/ChildContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const CATEGORY_CONFIG = {
  inicio: { label: 'Inicio', color: 'text-accent' },
  progreso: { label: 'Progreso', color: 'text-primary' },
  logro: { label: 'Logros', color: 'text-energy' },
  constancia: { label: 'Constancia', color: 'text-creative' },
  habilidad: { label: 'Habilidad', color: 'text-optimism' },
};

export default function LogrosTutor() {
  const { activeChild } = useChild();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterCategoria, setFilterCategoria] = useState('todos');

  const token = localStorage.getItem('auth_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!activeChild?._id) return;
    setLoading(true);
    fetch(`${API_URL}/api/progress/${activeChild._id}/achievements`, { headers })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [activeChild?._id]);

  if (!activeChild) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🏆</div>
          <h2 className="font-heading text-xl font-semibold text-text-strong mb-2">
            Selecciona un niño/a
          </h2>
          <p className="font-body text-sm text-text-soft">
            Ve a "Mis hijos", elige un perfil y luego vuelve aquí para ver los logros.
          </p>
        </div>
      </div>
    );
  }

  const achievements = data?.achievements || [];
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const streak = data?.streak || 0;

  const categorias = ['todos', ...new Set(achievements.map((a) => a.category))];
  const filtrados = achievements.filter(
    (a) => filterCategoria === 'todos' || a.category === filterCategoria
  );

  return (
    <div className="h-full overflow-y-auto p-8">
      {/* Header motivacional */}
      <div className="bg-gradient-to-r from-optimism/20 to-energy/20 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="text-5xl">🏆</div>
          <div>
            <h1 className="font-heading text-2xl font-semibold text-text-strong">
              Logros de {activeChild.name}
            </h1>
            {unlockedCount > 0 ? (
              <p className="font-body text-sm text-text-soft mt-1">
                {activeChild.name.split(' ')[0]} ha desbloqueado{' '}
                <span className="font-semibold text-energy">{unlockedCount}</span> de{' '}
                <span className="font-semibold text-text-strong">{achievements.length}</span> logros
              </p>
            ) : (
              <p className="font-body text-sm text-text-soft mt-1">
                Completa actividades para desbloquear logros
              </p>
            )}
          </div>
        </div>

        {/* Racha y puntos */}
        <div className="flex gap-4 mt-4">
          <div className="bg-white/60 rounded-xl px-4 py-2.5 flex items-center gap-2">
            <span className="text-2xl">🔥</span>
            <div>
              <p className="font-heading text-lg font-semibold text-text-strong">{streak}</p>
              <p className="font-body text-xs text-text-soft">días de racha</p>
            </div>
          </div>
          <div className="bg-white/60 rounded-xl px-4 py-2.5 flex items-center gap-2">
            <span className="text-2xl">⭐</span>
            <div>
              <p className="font-heading text-lg font-semibold text-text-strong">{unlockedCount}</p>
              <p className="font-body text-xs text-text-soft">logros desbloqueados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros por categoría */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategoria(cat)}
            className={`font-body text-sm px-4 py-1.5 rounded-full border transition ${
              filterCategoria === cat
                ? 'bg-accent text-white border-accent'
                : 'text-text-soft border-text-soft/20 hover:border-accent hover:text-accent'
            }`}
          >
            {cat === 'todos' ? 'Todos' : (CATEGORY_CONFIG[cat]?.label || cat)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="font-body text-sm text-text-soft">Cargando logros...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map((logro) => (
            <LogroBadge key={logro.id} logro={logro} />
          ))}
        </div>
      )}
    </div>
  );
}

function LogroBadge({ logro }) {
  const { unlocked, icon, title, description, progress, goal, category } = logro;
  const catConfig = CATEGORY_CONFIG[category] || { label: category, color: 'text-text-soft' };
  const pct = Math.min(100, Math.round((progress / goal) * 100));

  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm transition ${
      unlocked ? 'ring-2 ring-optimism/40' : 'opacity-60'
    }`}>
      {/* Badge icon */}
      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl mb-4 mx-auto ${
        unlocked ? 'bg-optimism/20' : 'bg-surface'
      }`}>
        {icon}
      </div>

      <div className="text-center mb-3">
        <h3 className="font-heading text-sm font-semibold text-text-strong">{title}</h3>
        <p className="font-body text-xs text-text-soft mt-1">{description}</p>
      </div>

      {/* Barra de progreso */}
      <div>
        <div className="flex justify-between mb-1">
          <span className={`font-body text-xs ${catConfig.color}`}>
            {catConfig.label}
          </span>
          <span className="font-body text-xs text-text-soft">{progress}/{goal}</span>
        </div>
        <div className="h-1.5 bg-surface rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${unlocked ? 'bg-optimism' : 'bg-text-soft/30'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {unlocked && (
        <div className="mt-3 text-center">
          <span className="font-body text-xs text-energy font-semibold">Desbloqueado</span>
        </div>
      )}
    </div>
  );
}
