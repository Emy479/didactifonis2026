import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const AVATAR_EMOJI = {
  'nino-1': '👦', 'nino-2': '🧒', 'nina-1': '👧', 'nina-2': '🧑',
};

function calcEdad(birthDate) {
  if (!birthDate) return null;
  const hoy = new Date();
  const nac = new Date(birthDate);
  return hoy.getFullYear() - nac.getFullYear();
}

export default function PacientesPro() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('auth_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch(`${API_URL}/api/professional/patients`, { headers })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setPatients(Array.isArray(data) ? data : []))
      .catch(() => setPatients([]))
      .finally(() => setLoading(false));
  }, []);

  const activos = patients.filter((p) => p.isActive).length;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold text-text-strong">Pacientes</h1>
        <p className="font-body text-sm text-text-soft mt-1">Gestiona y da seguimiento a todos tus pacientes</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="font-body text-xs text-text-soft mb-2">Total pacientes</p>
          <p className="font-heading text-3xl font-semibold text-primary">{patients.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="font-body text-xs text-text-soft mb-2">Activos</p>
          <p className="font-heading text-3xl font-semibold text-accent">{activos}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="font-body text-xs text-text-soft mb-2">Nuevos este mes</p>
          <p className="font-heading text-3xl font-semibold text-creative">
            {patients.filter((p) => {
              const creado = new Date(p.createdAt);
              const hoy = new Date();
              return creado.getMonth() === hoy.getMonth() && creado.getFullYear() === hoy.getFullYear();
            }).length}
          </p>
        </div>
      </div>

      {loading ? (
        <p className="font-body text-sm text-text-soft">Cargando pacientes...</p>
      ) : patients.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
          <p className="font-heading text-lg font-semibold text-text-strong mb-2">Sin pacientes aún</p>
          <p className="font-body text-sm text-text-soft max-w-sm mx-auto">
            Cuando un tutor acepte tu invitación, el niño aparecerá aquí con acceso a su progreso y actividades.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {patients.map((patient) => {
            const emoji = AVATAR_EMOJI[patient.avatarId] || '🧒';
            const edad = calcEdad(patient.birthDate);
            const progreso = patient.progress?.successRate ?? 0;
            const lastAct = patient.lastAssignment?.activityId?.title;

            return (
              <div key={patient._id} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center text-3xl flex-shrink-0">
                    {emoji}
                  </div>

                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-1">
                      <h3 className="font-heading text-base font-semibold text-text-strong">{patient.name}</h3>
                      {edad && (
                        <span className="font-body text-xs bg-surface text-text-soft px-2 py-0.5 rounded-full">
                          {edad} años
                        </span>
                      )}
                    </div>
                    <p className="font-body text-sm text-text-soft mb-3">
                      Tutor: {patient.tutorId?.name || '—'}
                    </p>

                    {/* Progreso */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="font-body text-xs text-text-soft">Progreso general</span>
                          <span className="font-body text-xs font-semibold text-text-strong">{progreso}%</span>
                        </div>
                        <div className="h-2 bg-surface rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                            style={{ width: `${progreso}%` }}
                          />
                        </div>
                      </div>
                      {lastAct && (
                        <div className="text-right min-w-max">
                          <p className="font-body text-xs text-text-soft">Última actividad</p>
                          <p className="font-body text-xs font-semibold text-text-strong truncate max-w-[160px]">
                            {lastAct}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Métricas */}
                  <div className="hidden lg:flex flex-col items-end gap-1 flex-shrink-0">
                    <p className="font-body text-xs text-text-soft">Actividades completadas</p>
                    <p className="font-heading text-xl font-semibold text-primary">
                      {patient.progress?.total ?? 0}
                    </p>
                    <p className="font-body text-xs text-text-soft mt-1">Superadas</p>
                    <p className="font-heading text-xl font-semibold text-accent">
                      {patient.progress?.passed ?? 0}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
