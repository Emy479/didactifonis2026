import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/apiFetch.js';

const TIPO_LABEL = {
  fonema: 'Fonema', silaba: 'Sílaba', palabra: 'Palabra',
  comprension: 'Comprensión', otro: 'Otro',
};
const NIVEL_COLOR = {
  1: 'bg-green-50 text-green-600',
  2: 'bg-optimism/20 text-yellow-700',
  3: 'bg-energy/20 text-orange-600',
};
const NIVEL_LABEL = { 1: 'Básico', 2: 'Intermedio', 3: 'Avanzado' };

const TIPO_ICON = {
  fonema: '🗣️', silaba: '🔤', palabra: '📖', comprension: '🧠', otro: '🎯',
};

const TIPOS = ['Todos', 'fonema', 'silaba', 'palabra', 'comprension', 'otro'];

export default function ActividadesPro() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTipo, setFilterTipo] = useState('Todos');
  const [filterNivel, setFilterNivel] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiFetch('/api/activities')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setActivities(Array.isArray(data) ? data : []))
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  }, []);

  const filtradas = activities.filter((a) => {
    const matchTipo = filterTipo === 'Todos' || a.type === filterTipo;
    const matchNivel = !filterNivel || a.difficultyLevel === Number(filterNivel);
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase());
    return matchTipo && matchNivel && matchSearch;
  });

  const kpis = {
    total: activities.length,
    misActividades: activities.length,
    masUsadas: activities.filter((a) => a.isActive).length,
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-text-strong">Actividades</h1>
          <p className="font-body text-sm text-text-soft mt-1">
            Biblioteca completa de actividades para asignar a tus pacientes
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="font-body text-xs text-text-soft mb-2">Todas las actividades</p>
          <p className="font-heading text-3xl font-semibold text-primary">{kpis.total}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="font-body text-xs text-text-soft mb-2">Actividades activas</p>
          <p className="font-heading text-3xl font-semibold text-accent">{kpis.masUsadas}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="font-body text-xs text-text-soft mb-2">Mostrando</p>
          <p className="font-heading text-3xl font-semibold text-creative">{filtradas.length}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar actividad..."
            className="border border-text-soft/20 rounded-xl px-4 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-accent w-64"
          />

          <div className="flex gap-2 flex-wrap">
            {TIPOS.map((t) => (
              <button
                key={t}
                onClick={() => setFilterTipo(t)}
                className={`font-body text-xs px-3 py-1.5 rounded-full border transition ${
                  filterTipo === t
                    ? 'bg-accent text-white border-accent'
                    : 'text-text-soft border-text-soft/20 hover:border-accent hover:text-accent'
                }`}
              >
                {t === 'Todos' ? 'Todos' : TIPO_LABEL[t]}
              </button>
            ))}
          </div>

          <select
            value={filterNivel}
            onChange={(e) => setFilterNivel(e.target.value)}
            className="border border-text-soft/20 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">Todos los niveles</option>
            <option value="1">Básico</option>
            <option value="2">Intermedio</option>
            <option value="3">Avanzado</option>
          </select>
        </div>
      </div>

      {/* Grid de actividades */}
      {loading ? (
        <p className="font-body text-sm text-text-soft">Cargando actividades...</p>
      ) : filtradas.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
          <p className="font-body text-text-soft">
            {activities.length === 0
              ? 'No hay actividades en el catálogo todavía. El Administrador debe subirlas.'
              : 'Sin resultados para los filtros seleccionados.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtradas.map((act) => (
            <div key={act._id} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col">
              {/* Thumbnail o placeholder */}
              <div className="w-full h-28 bg-gradient-to-br from-accent/10 to-primary/10 rounded-xl flex items-center justify-center mb-4 text-5xl">
                {TIPO_ICON[act.type] || '🎯'}
              </div>

              <h3 className="font-heading text-sm font-semibold text-text-strong mb-1 line-clamp-2">
                {act.title}
              </h3>

              <p className="font-body text-xs text-text-soft mb-3 line-clamp-2 flex-1">
                {act.therapeuticGoal || 'Sin objetivo terapéutico definido'}
              </p>

              <div className="flex flex-wrap gap-1.5 mt-auto">
                <span className={`font-body text-xs px-2 py-0.5 rounded-full ${NIVEL_COLOR[act.difficultyLevel] || 'bg-surface text-text-soft'}`}>
                  {NIVEL_LABEL[act.difficultyLevel] || `Nivel ${act.difficultyLevel}`}
                </span>
                <span className="font-body text-xs px-2 py-0.5 rounded-full bg-surface text-text-soft">
                  {TIPO_LABEL[act.type] || act.type}
                </span>
                {act.durationMinutes && (
                  <span className="font-body text-xs px-2 py-0.5 rounded-full bg-surface text-text-soft">
                    {act.durationMinutes} min
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
