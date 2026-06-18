import { useState, useEffect } from 'react';
import { useChild } from '../../context/ChildContext';
import { apiFetch } from '../../lib/apiFetch.js';

// Mapeo de áreas de progreso a etiquetas UI
const AREAS_CONFIG = [
  { key: 'pronunciacion',       label: 'Pronunciación',          color: 'text-accent',   bg: 'bg-accent' },
  { key: 'comprension',         label: 'Comprensión',            color: 'text-primary',  bg: 'bg-primary' },
  { key: 'concienciaFonologica',label: 'Conciencia fonológica',  color: 'text-creative', bg: 'bg-creative' },
  { key: 'participacion',       label: 'Participación',          color: 'text-energy',   bg: 'bg-energy' },
];

export default function ProgresoTutor() {
  const { activeChild } = useChild();
  const [progreso, setProgreso] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!activeChild?._id) return;
    setLoading(true);
    setError('');
    apiFetch(`/api/progress/${activeChild._id}`)
      .then((r) => {
        if (!r.ok) throw new Error('No se pudo cargar el progreso');
        return r.json();
      })
      .then((data) => setProgreso(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [activeChild?._id]);

  if (!activeChild) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="font-heading text-xl font-semibold text-text-strong mb-2">
            Selecciona un niño/a
          </h2>
          <p className="font-body text-sm text-text-soft">
            Ve a "Mis hijos", elige un perfil y luego vuelve aquí para ver el progreso.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-text-strong">Progreso</h1>
          <p className="font-body text-sm text-text-soft mt-1">
            Revisa el avance de <span className="font-semibold text-text-strong">{activeChild.name}</span> en su terapia y cada logro
          </p>
        </div>
        {progreso?.weeklyStats && (
          <div className="text-right">
            <p className="font-body text-xs text-text-soft">Última semana</p>
            <p className="font-heading text-sm font-semibold text-text-strong">
              {progreso.weeklyStats.activitiesCount} actividad{progreso.weeklyStats.activitiesCount !== 1 ? 'es' : ''}
            </p>
          </div>
        )}
      </div>

      {loading && <p className="font-body text-sm text-text-soft">Cargando progreso...</p>}
      {error && <p className="font-body text-sm text-red-500">{error}</p>}

      {progreso && !loading && (
        <>
          {/* Resumen semanal */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
              <p className="font-heading text-3xl font-semibold text-primary">
                {progreso.weeklyStats?.timeMinutes ?? 0}
                <span className="font-body text-base font-normal text-text-soft"> min</span>
              </p>
              <p className="font-body text-xs text-text-soft mt-1">Tiempo esta semana</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
              <p className="font-heading text-3xl font-semibold text-accent">
                {progreso.weeklyStats?.activitiesCount ?? 0}
              </p>
              <p className="font-body text-xs text-text-soft mt-1">Actividades</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
              <p className="font-heading text-3xl font-semibold text-energy">
                {progreso.weeklyStats?.streak ?? 0}
              </p>
              <p className="font-body text-xs text-text-soft mt-1">Racha (días)</p>
            </div>
          </div>

          {/* KPIs de área */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <h2 className="font-heading text-base font-semibold text-text-strong mb-5">
              Resumen general de progreso
            </h2>
            {progreso.kpis.total === 0 ? (
              <div className="text-center py-4">
                <p className="font-body text-sm text-text-soft">
                  Aún no hay actividades completadas. Las métricas aparecerán cuando {activeChild.name} complete su primera actividad.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {AREAS_CONFIG.map(({ key, label, color, bg }) => {
                  const area = progreso.areas[key] || { successRate: 0, completed: 0 };
                  return (
                    <div key={key} className="text-center">
                      {/* Círculo de progreso (CSS) */}
                      <div className="relative w-20 h-20 mx-auto mb-3">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15.9" fill="none"
                            className="stroke-surface" strokeWidth="3" />
                          <circle cx="18" cy="18" r="15.9" fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeDasharray={`${area.successRate} ${100 - area.successRate}`}
                            strokeLinecap="round"
                            className={color} />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`font-heading text-base font-semibold ${color}`}>
                            {area.successRate}%
                          </span>
                        </div>
                      </div>
                      <p className="font-body text-xs font-semibold text-text-strong">{label}</p>
                      <p className="font-body text-xs text-text-soft mt-0.5">
                        {area.completed} completadas
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Áreas de trabajo — barras horizontales */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <h2 className="font-heading text-base font-semibold text-text-strong mb-4">
              Áreas de trabajo
            </h2>
            <div className="space-y-4">
              {AREAS_CONFIG.map(({ key, label, bg }) => {
                const area = progreso.areas[key] || { successRate: 0 };
                return (
                  <div key={key}>
                    <div className="flex justify-between mb-1">
                      <span className="font-body text-sm text-text-strong">{label}</span>
                      <span className="font-body text-sm font-semibold text-text-strong">
                        {area.successRate}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-surface rounded-full overflow-hidden">
                      <div
                        className={`h-full ${bg} rounded-full transition-all`}
                        style={{ width: `${area.successRate}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Historial simple */}
          {progreso.history && progreso.history.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
              <h2 className="font-heading text-base font-semibold text-text-strong mb-4">
                Actividad reciente (últimos 30 días)
              </h2>
              <div className="flex items-end gap-1 h-16">
                {progreso.history.slice(-14).map((punto, i) => {
                  const max = Math.max(...progreso.history.map((p) => p.completed), 1);
                  const altura = Math.max(8, Math.round((punto.completed / max) * 64));
                  return (
                    <div key={i} title={`${punto.date}: ${punto.completed} actividades`}
                      className="flex-1 bg-accent/30 rounded-t hover:bg-accent/60 transition cursor-help"
                      style={{ height: `${altura}px` }}
                    />
                  );
                })}
              </div>
              <p className="font-body text-xs text-text-soft mt-2">
                Últimas {Math.min(14, progreso.history.length)} jornadas activas
              </p>
            </div>
          )}

          {/* Logros recientes */}
          {progreso.achievements?.filter((a) => a.unlocked).length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-heading text-base font-semibold text-text-strong">Logros recientes</h2>
              </div>
              <div className="flex gap-3 flex-wrap">
                {progreso.achievements
                  .filter((a) => a.unlocked)
                  .slice(0, 4)
                  .map((logro) => (
                    <div key={logro.id}
                      className="flex items-center gap-2 bg-optimism/10 border border-optimism/30 rounded-xl px-3 py-2">
                      <span className="text-xl">{logro.icon}</span>
                      <span className="font-body text-sm font-semibold text-text-strong">{logro.title}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
