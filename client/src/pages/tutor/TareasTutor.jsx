import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/apiFetch.js';

const STATUS_BADGE = {
  pending: 'bg-energy/20 text-energy',
  completed: 'bg-primary/20 text-primary',
  skipped: 'bg-text-soft/20 text-text-soft',
};

const STATUS_LABEL = {
  pending: 'Pendiente',
  completed: 'Completada',
  skipped: 'Omitida',
};

const TYPE_COLORS = {
  articulation: 'bg-accent/20 text-accent',
  phonological: 'bg-creative/20 text-creative',
  vocabulary: 'bg-primary/20 text-primary',
  comprehension: 'bg-energy/20 text-energy',
  default: 'bg-surface text-text-soft',
};

const TYPE_BG = {
  articulation: 'bg-accent/10',
  phonological: 'bg-creative/10',
  vocabulary: 'bg-primary/10',
  comprehension: 'bg-energy/10',
  default: 'bg-surface',
};

const LEVEL_LABELS = {
  1: 'Nivel 1',
  2: 'Nivel 2',
  3: 'Nivel 3',
};

function typeColor(type) {
  return TYPE_COLORS[type] || TYPE_COLORS.default;
}

function typeBg(type) {
  return TYPE_BG[type] || TYPE_BG.default;
}

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export default function TareasTutor({ selectedChildId }) {
  const [activeTab, setActiveTab] = useState('pendientes');
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedChildId) {
      setAssignments([]);
      return;
    }
    const fetchAssignments = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/assignments?childId=${selectedChildId}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setAssignments(Array.isArray(data) ? data : []);
      } catch {
        setAssignments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAssignments();
  }, [selectedChildId]);

  const tabs = [
    { id: 'pendientes', label: 'Pendientes' },
    { id: 'completadas', label: 'Completadas' },
    { id: 'todas', label: `Todas (${assignments.length})` },
  ];

  const filteredAssignments = assignments.filter((a) => {
    if (activeTab === 'pendientes') return a.status === 'pending';
    if (activeTab === 'completadas') return a.status === 'completed';
    return true;
  });

  const totalPending = assignments.filter((a) => a.status === 'pending').length;
  const totalCompleted = assignments.filter((a) => a.status === 'completed').length;
  const totalAll = assignments.length;

  if (!selectedChildId) {
    return (
      <div className="h-full flex items-center justify-center bg-surface">
        <p className="font-body text-text-soft">
          Selecciona un nino/a para ver sus tareas.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-surface">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-semibold text-text-strong mb-1">
            Tareas
          </h1>
          <p className="font-body text-sm text-text-soft">
            Actividades y ejercicios para apoyar la terapia en casa
          </p>
        </div>

        <div className="flex gap-6 items-start">
          {/* Columna principal */}
          <div className="flex-1 min-w-0">
            {/* Tabs */}
            <div className="flex gap-1 bg-white rounded-xl p-1 mb-6 w-fit shadow-sm">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`font-body text-sm px-5 py-2 rounded-xl transition ${
                    activeTab === tab.id
                      ? 'bg-accent text-white font-semibold'
                      : 'text-text-soft hover:text-text-strong'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Lista */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <p className="font-body text-text-soft">Cargando tareas...</p>
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <p className="font-body text-text-soft">
                  No hay tareas en esta categoria.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAssignments.map((assignment) => (
                  <TareaRow key={assignment._id} assignment={assignment} />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0 space-y-4">
            {/* Resumen de tareas */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-heading text-base font-semibold text-text-strong mb-4">
                Resumen de tareas
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-body text-sm text-text-soft">Pendientes</p>
                  <span className="font-heading text-lg font-bold text-energy">
                    {totalPending}
                  </span>
                </div>
                <div className="w-full bg-surface rounded-full h-1.5">
                  <div
                    className="bg-energy h-1.5 rounded-full transition-all"
                    style={{ width: totalAll > 0 ? `${(totalPending / totalAll) * 100}%` : '0%' }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="font-body text-sm text-text-soft">Completadas</p>
                  <span className="font-heading text-lg font-bold text-primary">
                    {totalCompleted}
                  </span>
                </div>
                <div className="w-full bg-surface rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all"
                    style={{ width: totalAll > 0 ? `${(totalCompleted / totalAll) * 100}%` : '0%' }}
                  />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-surface">
                  <p className="font-body text-sm font-medium text-text-strong">Total general</p>
                  <span className="font-heading text-lg font-bold text-text-strong">
                    {totalAll}
                  </span>
                </div>
              </div>
            </div>

            {/* Consigna para casa */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-heading text-base font-semibold text-text-strong mb-3">
                Consigna para casa
              </h2>
              <p className="font-body text-sm text-text-soft">
                Practica con tu hijo/a durante 10 a 15 minutos diarios. La constancia
                es clave para ver resultados.
              </p>
            </div>

            {/* Proxima cita */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-heading text-base font-semibold text-text-strong mb-3">
                Proxima cita
              </h2>
              <p className="font-body text-sm text-text-soft italic">
                Sin informacion disponible aun.
              </p>
              <button
                disabled
                className="mt-3 w-full bg-surface text-text-soft font-body text-xs rounded-xl px-3 py-2 cursor-default"
              >
                Ver calendario
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function TareaRow({ assignment }) {
  const activity = assignment.activityId || {};
  const status = assignment.status || 'pending';
  const badgeClass = STATUS_BADGE[status] || STATUS_BADGE.pending;
  const badgeLabel = STATUS_LABEL[status] || status;

  return (
    <div className="bg-white rounded-2xl p-5 flex gap-4 items-center shadow-sm hover:shadow-md transition">
      {/* Thumbnail o color placeholder */}
      <div className="flex-shrink-0">
        {activity.thumbnailUrl ? (
          <img
            src={activity.thumbnailUrl}
            alt={activity.title}
            className="w-20 h-14 rounded-xl object-cover"
          />
        ) : (
          <div
            className={`w-20 h-14 rounded-xl flex items-center justify-center ${typeBg(activity.type)}`}
          >
            <span className="font-heading text-xs font-semibold text-text-soft uppercase tracking-wide">
              {activity.type || 'Act'}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-heading text-base font-semibold text-text-strong mb-1 truncate">
          {activity.title || 'Actividad'}
        </h3>
        <div className="flex flex-wrap gap-2 items-center">
          {activity.type && (
            <span className={`font-body text-xs px-2 py-0.5 rounded-lg ${typeColor(activity.type)}`}>
              {activity.type}
            </span>
          )}
          {activity.difficultyLevel && (
            <span className="font-body text-xs px-2 py-0.5 rounded-lg bg-surface text-text-soft">
              {LEVEL_LABELS[activity.difficultyLevel] || `Nivel ${activity.difficultyLevel}`}
            </span>
          )}
        </div>
        <div className="flex gap-4 mt-1">
          {assignment.createdAt && (
            <p className="font-body text-xs text-text-soft">
              Asignada: {formatDate(assignment.createdAt)}
            </p>
          )}
          {assignment.dueDate && (
            <p className="font-body text-xs text-text-soft">
              Vence: {formatDate(assignment.dueDate)}
            </p>
          )}
        </div>
      </div>

      {/* Badge de estado */}
      <div className="flex-shrink-0">
        <span className={`font-body text-xs px-3 py-1.5 rounded-xl font-semibold ${badgeClass}`}>
          {badgeLabel}
        </span>
      </div>
    </div>
  );
}
