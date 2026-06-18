import { useState, useEffect } from 'react';
import { API_URL } from '../../config';

const STATUS_LABEL = { active: 'Activa', completed: 'Completada', review: 'En revisión' };
const STATUS_COLOR = {
  active: 'bg-green-50 text-green-600',
  completed: 'bg-primary/10 text-primary',
  review: 'bg-optimism/20 text-yellow-700',
};
const AVATAR_EMOJI = {
  'nino-1': '👦', 'nino-2': '🧒', 'nina-1': '👧', 'nina-2': '🧑',
};

const FORM_INICIAL = { name: '', childId: '', therapeuticGoal: '' };

export default function TerapiasPro() {
  const [therapies, setTherapies] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const token = localStorage.getItem('auth_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, pRes] = await Promise.all([
        fetch(`${API_URL}/api/professional/therapies`, { headers }),
        fetch(`${API_URL}/api/professional/patients`, { headers }),
      ]);
      const tData = tRes.ok ? await tRes.json() : [];
      const pData = pRes.ok ? await pRes.json() : [];
      setTherapies(Array.isArray(tData) ? tData : []);
      setPatients(Array.isArray(pData) ? pData : []);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filtradas = therapies.filter((t) =>
    !filterStatus || t.status === filterStatus
  );

  const openCreate = () => {
    setForm(FORM_INICIAL);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/professional/therapies`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: form.name,
          childId: form.childId,
          therapeuticGoal: form.therapeuticGoal || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al crear terapia');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const kpis = {
    active: therapies.filter((t) => t.status === 'active').length,
    completed: therapies.filter((t) => t.status === 'completed').length,
    review: therapies.filter((t) => t.status === 'review').length,
    total: therapies.length,
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-text-strong">Terapias</h1>
          <p className="font-body text-sm text-text-soft mt-1">
            Diseña y da seguimiento a los planes terapéuticos de tus pacientes
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-accent text-white font-heading font-semibold text-sm rounded-xl px-5 py-2.5 hover:opacity-90 transition"
        >
          + Crear terapia
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="font-body text-xs text-text-soft mb-2">Terapias activas</p>
          <p className="font-heading text-3xl font-semibold text-green-500">{kpis.active}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="font-body text-xs text-text-soft mb-2">Completadas</p>
          <p className="font-heading text-3xl font-semibold text-primary">{kpis.completed}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="font-body text-xs text-text-soft mb-2">En revisión</p>
          <p className="font-heading text-3xl font-semibold text-yellow-600">{kpis.review}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="font-body text-xs text-text-soft mb-2">Total</p>
          <p className="font-heading text-3xl font-semibold text-text-strong">{kpis.total}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-5">
        {['', 'active', 'completed', 'review'].map((s) => (
          <button key={s}
            onClick={() => setFilterStatus(s)}
            className={`font-body text-sm px-4 py-1.5 rounded-full border transition ${
              filterStatus === s
                ? 'bg-accent text-white border-accent'
                : 'text-text-soft border-text-soft/20 hover:border-accent hover:text-accent'
            }`}
          >
            {s === '' ? 'Todas' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* Lista de terapias */}
      {loading ? (
        <p className="font-body text-sm text-text-soft">Cargando...</p>
      ) : filtradas.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
          {therapies.length === 0 ? (
            <>
              <p className="font-heading text-lg font-semibold text-text-strong mb-2">Sin terapias aún</p>
              <p className="font-body text-sm text-text-soft mb-4">
                Crea la primera terapia para un paciente vinculado.
              </p>
              <button onClick={openCreate}
                className="bg-accent text-white font-heading text-sm rounded-xl px-5 py-2.5 hover:opacity-90 transition">
                Crear primera terapia
              </button>
            </>
          ) : (
            <p className="font-body text-text-soft">Sin terapias en esta categoría.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtradas.map((therapy) => {
            const emoji = AVATAR_EMOJI[therapy.childId?.avatarId] || '🧒';
            const progreso = therapy.progress?.successRate ?? 0;

            return (
              <div key={therapy._id} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  {/* Avatar paciente */}
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-2xl flex-shrink-0">
                    {emoji}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-1">
                      <h3 className="font-heading text-base font-semibold text-text-strong">
                        {therapy.name}
                      </h3>
                      <span className={`font-body text-xs px-2.5 py-0.5 rounded-full ${STATUS_COLOR[therapy.status]}`}>
                        {STATUS_LABEL[therapy.status]}
                      </span>
                    </div>

                    <p className="font-body text-sm text-text-soft mb-1">
                      Paciente: <span className="text-text-strong font-medium">{therapy.childId?.name || '—'}</span>
                    </p>

                    {therapy.therapeuticGoal && (
                      <p className="font-body text-sm text-text-soft mb-3">
                        Objetivo: {therapy.therapeuticGoal}
                      </p>
                    )}

                    {/* Progreso */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 max-w-xs">
                        <div className="flex justify-between mb-1">
                          <span className="font-body text-xs text-text-soft">Progreso general</span>
                          <span className="font-body text-xs font-semibold text-text-strong">{progreso}%</span>
                        </div>
                        <div className="h-2 bg-surface rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-accent to-primary rounded-full transition-all"
                            style={{ width: `${progreso}%` }}
                          />
                        </div>
                      </div>
                      <div className="font-body text-xs text-text-soft">
                        {therapy.sessions} sesión{therapy.sessions !== 1 ? 'es' : ''}
                      </div>
                    </div>
                  </div>

                  {/* Métricas */}
                  <div className="hidden lg:flex flex-col items-end gap-1 text-right flex-shrink-0">
                    <p className="font-body text-xs text-text-soft">Actividades</p>
                    <p className="font-heading text-xl font-semibold text-primary">
                      {therapy.progress?.total ?? 0}
                    </p>
                    <p className="font-body text-xs text-text-soft">Superadas</p>
                    <p className="font-heading text-xl font-semibold text-accent">
                      {therapy.progress?.passed ?? 0}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal crear terapia */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h2 className="font-heading text-xl font-semibold text-text-strong mb-6">Nueva terapia</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="font-body text-sm font-medium text-text-strong block mb-1.5">
                  Nombre de la terapia <span className="text-red-400">*</span>
                </label>
                <input
                  type="text" required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-text-soft/20 rounded-xl px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="Ej: Terapia de fonología para Sofía"
                />
              </div>

              <div>
                <label className="font-body text-sm font-medium text-text-strong block mb-1.5">
                  Paciente <span className="text-red-400">*</span>
                </label>
                {patients.length === 0 ? (
                  <p className="font-body text-sm text-text-soft">
                    No tienes pacientes vinculados. Primero vincula un paciente.
                  </p>
                ) : (
                  <select
                    required value={form.childId}
                    onChange={(e) => setForm({ ...form, childId: e.target.value })}
                    className="w-full border border-text-soft/20 rounded-xl px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="">Selecciona un paciente</option>
                    {patients.map((p) => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="font-body text-sm font-medium text-text-strong block mb-1.5">
                  Objetivo terapéutico
                </label>
                <textarea
                  rows={3} value={form.therapeuticGoal}
                  onChange={(e) => setForm({ ...form, therapeuticGoal: e.target.value })}
                  className="w-full border border-text-soft/20 rounded-xl px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="Ej: Mejorar la producción del fonema /r/ en posición inicial"
                />
              </div>

              {error && <p className="font-body text-sm text-red-500">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 bg-surface text-text-strong font-heading font-semibold rounded-xl px-6 py-3 hover:bg-text-soft/10 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={submitting || patients.length === 0}
                  className="flex-1 bg-accent text-white font-heading font-semibold rounded-xl px-6 py-3 hover:opacity-90 transition disabled:opacity-60">
                  {submitting ? 'Creando...' : 'Crear terapia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
