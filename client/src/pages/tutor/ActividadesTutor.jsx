import { useState, useEffect, useCallback } from 'react';
import { useChild } from '../../context/ChildContext';
import { apiFetch } from '../../lib/apiFetch.js';

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

export default function ActividadesTutor({ selectedChildId }) {
  const { children } = useChild();

  const [activeTab, setActiveTab] = useState('todas');
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  const [modalActivity, setModalActivity] = useState(null);
  const [dueDate, setDueDate] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [modalError, setModalError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [noChildMsg, setNoChildMsg] = useState('');

  const selectedChild = children.find((c) => c._id === selectedChildId) || null;
  const hasLinkedProfessional = !!(selectedChild && selectedChild.linkedProfessional);

  // Fetch catalog
  useEffect(() => {
    const fetchActivities = async () => {
      setLoadingActivities(true);
      try {
        const res = await apiFetch('/api/activities');
        if (!res.ok) throw new Error('Error al cargar actividades');
        const data = await res.json();
        setActivities(data);
      } catch {
        setActivities([]);
      } finally {
        setLoadingActivities(false);
      }
    };
    fetchActivities();
  }, []);

  // Fetch assignments when tab or child changes
  const fetchAssignments = useCallback(async (status) => {
    if (!selectedChildId) return;
    setLoadingAssignments(true);
    try {
      const statusParam = status === 'asignadas' ? 'pending' : 'completed';
      const res = await apiFetch(
        `/api/assignments?childId=${selectedChildId}&status=${statusParam}`
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAssignments(data);
    } catch {
      setAssignments([]);
    } finally {
      setLoadingAssignments(false);
    }
  }, [selectedChildId]);

  useEffect(() => {
    if (activeTab === 'asignadas' || activeTab === 'completadas') {
      fetchAssignments(activeTab);
    }
  }, [activeTab, fetchAssignments]);

  const handleOpenModal = (activity) => {
    if (!selectedChildId) {
      setNoChildMsg(activity._id);
      setTimeout(() => setNoChildMsg(''), 3000);
      return;
    }
    setModalActivity(activity);
    setDueDate('');
    setModalError('');
  };

  const handleCloseModal = () => {
    setModalActivity(null);
    setDueDate('');
    setModalError('');
  };

  const handleAssign = async () => {
    if (!selectedChildId || !modalActivity) return;
    setAssigning(true);
    setModalError('');
    try {
      const body = { activityId: modalActivity._id, childId: selectedChildId };
      if (dueDate) body.dueDate = dueDate;
      const res = await apiFetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        setModalError(
          data.message || 'Esta actividad no esta disponible para tutores'
        );
        return;
      }
      if (!res.ok) throw new Error('Error al asignar');
      handleCloseModal();
      setSuccessMsg('Actividad asignada correctamente.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setModalError('Ocurrio un error al asignar. Por favor intenta de nuevo.');
    } finally {
      setAssigning(false);
    }
  };

  const tabs = [
    { id: 'asignadas', label: 'Asignadas' },
    { id: 'completadas', label: 'Completadas' },
    { id: 'todas', label: 'Todas' },
  ];

  const renderTabContent = () => {
    if (activeTab === 'todas') {
      if (loadingActivities) {
        return (
          <div className="flex items-center justify-center py-16">
            <p className="font-body text-text-soft">Cargando actividades...</p>
          </div>
        );
      }
      if (activities.length === 0) {
        return (
          <div className="flex items-center justify-center py-16">
            <p className="font-body text-text-soft">No hay actividades disponibles.</p>
          </div>
        );
      }
      return (
        <div className="space-y-3">
          {activities.map((activity) => (
            <ActivityCard
              key={activity._id}
              activity={activity}
              selectedChildId={selectedChildId}
              noChildMsg={noChildMsg}
              onAssign={handleOpenModal}
            />
          ))}
        </div>
      );
    }

    // Asignadas / Completadas
    if (!selectedChildId) {
      return (
        <div className="flex items-center justify-center py-16">
          <p className="font-body text-text-soft">
            Selecciona un nino/a para ver sus actividades asignadas.
          </p>
        </div>
      );
    }
    if (loadingAssignments) {
      return (
        <div className="flex items-center justify-center py-16">
          <p className="font-body text-text-soft">Cargando actividades...</p>
        </div>
      );
    }
    if (assignments.length === 0) {
      return (
        <div className="flex items-center justify-center py-16">
          <p className="font-body text-text-soft">No hay actividades en esta categoria.</p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {assignments.map((assignment) => (
          <AssignmentCard key={assignment._id} assignment={assignment} tab={activeTab} />
        ))}
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-surface">
      <div className="max-w-5xl mx-auto p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-semibold text-text-strong mb-1">
            Actividades
          </h1>
          {selectedChild && (
            <p className="font-body text-sm text-text-soft">
              Actividades para {selectedChild.name}
            </p>
          )}
        </div>

        {/* Aviso sin profesional vinculado */}
        {selectedChildId && !hasLinkedProfessional && (
          <div className="bg-accent/10 border border-accent/30 rounded-xl p-3 mb-5">
            <p className="font-body text-sm text-text-strong">
              El material de apoyo ayuda, pero no reemplaza el tratamiento ni el
              seguimiento de un profesional fonoaudiologo.
            </p>
          </div>
        )}

        {/* Exito inline */}
        {successMsg && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 mb-5">
            <p className="font-body text-sm text-primary font-semibold">{successMsg}</p>
          </div>
        )}

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

        {/* Contenido */}
        {renderTabContent()}
      </div>

      {/* Modal de asignacion */}
      {modalActivity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl">
            <h2 className="font-heading text-xl font-semibold text-text-strong mb-1">
              Asignar actividad
            </h2>
            <p className="font-body text-sm text-text-soft mb-6">
              {modalActivity.title}
            </p>

            <div className="mb-5">
              <label className="font-body text-sm font-medium text-text-strong block mb-2">
                Fecha limite (opcional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border border-text-soft/20 rounded-xl px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {modalError && (
              <div className="bg-energy/10 border border-energy/30 rounded-xl p-3 mb-4">
                <p className="font-body text-sm text-text-strong">{modalError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={assigning}
                className="flex-1 bg-surface text-text-strong font-heading font-semibold rounded-xl px-6 py-3 hover:bg-text-soft/10 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAssign}
                disabled={assigning}
                className="flex-1 bg-accent text-white font-heading font-semibold rounded-xl px-6 py-3 hover:opacity-90 transition disabled:opacity-60"
              >
                {assigning ? 'Asignando...' : 'Confirmar asignacion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityCard({ activity, selectedChildId, noChildMsg, onAssign }) {
  const isNoChildTooltip = noChildMsg === activity._id;

  return (
    <div className="bg-white rounded-2xl p-5 flex gap-4 items-start shadow-sm hover:shadow-md transition">
      {/* Thumbnail o color placeholder */}
      <div className="flex-shrink-0">
        {activity.thumbnailUrl ? (
          <img
            src={activity.thumbnailUrl}
            alt={activity.title}
            className="w-20 h-16 rounded-xl object-cover"
          />
        ) : (
          <div
            className={`w-20 h-16 rounded-xl flex items-center justify-center ${typeBg(activity.type)}`}
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
          {activity.title}
        </h3>
        <div className="flex flex-wrap gap-2 mb-1">
          {activity.type && (
            <span
              className={`font-body text-xs px-2 py-0.5 rounded-lg font-medium ${typeColor(activity.type)}`}
            >
              {activity.type}
            </span>
          )}
          {activity.difficultyLevel && (
            <span className="font-body text-xs px-2 py-0.5 rounded-lg bg-surface text-text-soft">
              {LEVEL_LABELS[activity.difficultyLevel] || `Nivel ${activity.difficultyLevel}`}
            </span>
          )}
          {activity.durationMinutes && (
            <span className="font-body text-xs text-text-soft">
              {activity.durationMinutes} min
            </span>
          )}
        </div>
        {activity.description && (
          <p className="font-body text-xs text-text-soft line-clamp-2">
            {activity.description}
          </p>
        )}
      </div>

      {/* Accion */}
      <div className="flex-shrink-0 relative">
        <button
          onClick={() => onAssign(activity)}
          className={`font-heading text-sm font-semibold rounded-xl px-4 py-2 transition ${
            selectedChildId
              ? 'bg-accent text-white hover:opacity-90'
              : 'bg-surface text-text-soft cursor-default'
          }`}
        >
          Asignar
        </button>
        {isNoChildTooltip && (
          <div className="absolute right-0 top-full mt-1 w-52 bg-text-strong text-white font-body text-xs rounded-xl p-2 z-10 shadow-lg">
            Selecciona primero un nino/a.
          </div>
        )}
      </div>
    </div>
  );
}

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

function AssignmentCard({ assignment, tab }) {
  const activity = assignment.activityId || {};
  const status = assignment.status || (tab === 'completadas' ? 'completed' : 'pending');
  const badgeClass = STATUS_BADGE[status] || STATUS_BADGE.pending;
  const badgeLabel = STATUS_LABEL[status] || status;

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-2xl p-5 flex gap-4 items-start shadow-sm">
      <div className="flex-shrink-0">
        {activity.thumbnailUrl ? (
          <img
            src={activity.thumbnailUrl}
            alt={activity.title}
            className="w-20 h-16 rounded-xl object-cover"
          />
        ) : (
          <div className={`w-20 h-16 rounded-xl flex items-center justify-center ${typeBg(activity.type)}`}>
            <span className="font-heading text-xs font-semibold text-text-soft uppercase tracking-wide">
              {activity.type || 'Act'}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-heading text-base font-semibold text-text-strong mb-1 truncate">
          {activity.title || 'Actividad'}
        </h3>
        <div className="flex flex-wrap gap-2 items-center">
          <span className={`font-body text-xs px-2 py-0.5 rounded-lg font-medium ${badgeClass}`}>
            {badgeLabel}
          </span>
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
        {assignment.dueDate && (
          <p className="font-body text-xs text-text-soft mt-1">
            Fecha limite: {formatDate(assignment.dueDate)}
          </p>
        )}
      </div>
    </div>
  );
}
