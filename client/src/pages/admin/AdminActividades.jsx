import { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const TIPO_LABEL = {
  fonema: 'Fonema', silaba: 'Sílaba', palabra: 'Palabra',
  comprension: 'Comprensión', otro: 'Otro',
};
const NIVEL_LABEL = { 1: 'Básico', 2: 'Intermedio', 3: 'Avanzado' };
const NIVEL_COLOR = {
  1: 'bg-green-50 text-green-600',
  2: 'bg-optimism/20 text-yellow-700',
  3: 'bg-energy/20 text-orange-600',
};

const FORM_INICIAL = {
  title: '', type: 'fonema', therapeuticGoal: '', difficultyLevel: 1,
  ageMin: '', ageMax: '', durationMinutes: '', availableToTutors: false,
  thumbnailUrl: '',
};

export default function AdminActividades() {
  const [activities, setActivities] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [bundleFile, setBundleFile] = useState(null);
  const [errorDetails, setErrorDetails] = useState([]);
  const LIMIT = 15;

  const token = localStorage.getItem('auth_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/activities?page=${page}&limit=${LIMIT}`, { headers });
      const data = await res.json();
      setActivities(Array.isArray(data) ? data : (data.activities || []));
      setTotal(Array.isArray(data) ? data.length : (data.total || data.length || 0));
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(FORM_INICIAL);
    setError('');
    setBundleFile(null);
    setErrorDetails([]);
    setShowModal(true);
  };

  const openEdit = (act) => {
    setEditTarget(act);
    setForm({
      title: act.title,
      type: act.type,
      therapeuticGoal: act.therapeuticGoal || '',
      difficultyLevel: act.difficultyLevel,
      ageMin: act.ageRange?.min ?? '',
      ageMax: act.ageRange?.max ?? '',
      durationMinutes: act.durationMinutes ?? '',
      availableToTutors: act.availableToTutors,
      thumbnailUrl: act.thumbnailUrl || '',
    });
    setError('');
    setBundleFile(null);
    setErrorDetails([]);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setErrorDetails([]);
    try {
      if (!editTarget) {
        // ── Crear: subir ZIP (multipart) ──
        if (!bundleFile) {
          throw new Error('Debes seleccionar el archivo .zip del juego.');
        }
        const fd = new FormData();
        fd.append('bundle', bundleFile);
        fd.append('type', form.type);
        fd.append('difficultyLevel', String(form.difficultyLevel));
        fd.append('therapeuticGoal', form.therapeuticGoal || '');
        fd.append('availableToTutors', String(form.availableToTutors));
        const res = await fetch(`${API_URL}/api/activities/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }, // NO fijar Content-Type: el navegador pone el boundary
          body: fd,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (Array.isArray(err.details)) setErrorDetails(err.details);
          throw new Error(err.message || 'Error al subir el juego');
        }
      } else {
        // ── Editar metadatos (sin bundle) ──
        const body = {
          title: form.title,
          type: form.type,
          therapeuticGoal: form.therapeuticGoal || null,
          difficultyLevel: Number(form.difficultyLevel),
          ageRange: {
            min: form.ageMin !== '' ? Number(form.ageMin) : null,
            max: form.ageMax !== '' ? Number(form.ageMax) : null,
          },
          durationMinutes: form.durationMinutes !== '' ? Number(form.durationMinutes) : null,
          availableToTutors: form.availableToTutors,
          thumbnailUrl: form.thumbnailUrl || null,
        };
        const res = await fetch(`${API_URL}/api/activities/${editTarget._id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Error al guardar');
        }
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplaceBundle = async (file) => {
    if (!file || !editTarget) return;
    setSubmitting(true);
    setError('');
    setErrorDetails([]);
    try {
      const fd = new FormData();
      fd.append('bundle', file);
      const res = await fetch(`${API_URL}/api/activities/${editTarget._id}/bundle`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (Array.isArray(err.details)) setErrorDetails(err.details);
        throw new Error(err.message || 'Error al reemplazar el bundle');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-text-strong">Actividades</h1>
          <p className="font-body text-sm text-text-soft mt-1">Gestiona el catálogo de actividades de la plataforma</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-primary text-white font-heading font-semibold text-sm rounded-xl px-5 py-2.5 hover:opacity-90 transition"
        >
          + Crear actividad
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="font-body text-xs text-text-soft mb-2">Total actividades</p>
          <p className="font-heading text-3xl font-semibold text-primary">{total}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="font-body text-xs text-text-soft mb-2">Disponibles a tutores</p>
          <p className="font-heading text-3xl font-semibold text-accent">
            {activities.filter((a) => a.availableToTutors).length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-heading text-base font-semibold text-text-strong">Catálogo</h2>
          <p className="font-body text-sm text-text-soft">{total} actividades</p>
        </div>

        {loading ? (
          <p className="font-body text-sm text-text-soft">Cargando...</p>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <p className="font-body text-text-soft mb-4">Sin actividades en el catálogo.</p>
            <button onClick={openCreate} className="bg-primary text-white font-heading text-sm rounded-xl px-5 py-2.5 hover:opacity-90 transition">
              Crear primera actividad
            </button>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-surface">
                  <th className="font-body text-xs text-text-soft font-medium pb-3">Título</th>
                  <th className="font-body text-xs text-text-soft font-medium pb-3">Tipo</th>
                  <th className="font-body text-xs text-text-soft font-medium pb-3">Nivel</th>
                  <th className="font-body text-xs text-text-soft font-medium pb-3">Duración</th>
                  <th className="font-body text-xs text-text-soft font-medium pb-3">Tutores</th>
                  <th className="font-body text-xs text-text-soft font-medium pb-3">Estado</th>
                  <th className="font-body text-xs text-text-soft font-medium pb-3">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface">
                {activities.map((a) => (
                  <tr key={a._id} className="hover:bg-surface/50 transition">
                    <td className="py-3 font-body text-sm text-text-strong max-w-xs truncate">{a.title}</td>
                    <td className="py-3 font-body text-sm text-text-soft">{TIPO_LABEL[a.type] || a.type}</td>
                    <td className="py-3">
                      <span className={`font-body text-xs px-2 py-1 rounded-full ${NIVEL_COLOR[a.difficultyLevel] || 'bg-surface text-text-soft'}`}>
                        {NIVEL_LABEL[a.difficultyLevel] || a.difficultyLevel}
                      </span>
                    </td>
                    <td className="py-3 font-body text-sm text-text-soft">
                      {a.durationMinutes ? `${a.durationMinutes} min` : '—'}
                    </td>
                    <td className="py-3">
                      <span className={`font-body text-xs px-2 py-1 rounded-full ${a.availableToTutors ? 'bg-green-50 text-green-600' : 'bg-surface text-text-soft'}`}>
                        {a.availableToTutors ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`font-body text-xs px-2 py-1 rounded-full ${a.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                        {a.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="py-3">
                      <button onClick={() => openEdit(a)} className="font-body text-xs text-accent hover:underline">
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex gap-2 mt-4 items-center justify-end">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                  className="font-body text-sm px-3 py-1.5 rounded-xl border border-text-soft/20 disabled:opacity-40 hover:border-primary hover:text-primary transition">
                  Anterior
                </button>
                <span className="font-body text-sm text-text-soft">{page} / {totalPages}</span>
                <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
                  className="font-body text-sm px-3 py-1.5 rounded-xl border border-text-soft/20 disabled:opacity-40 hover:border-primary hover:text-primary transition">
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal crear/editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="font-heading text-xl font-semibold text-text-strong mb-6">
              {editTarget ? 'Editar actividad' : 'Nueva actividad'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label={editTarget ? 'Título' : 'Título (se tomará del manifest del juego)'} required={!!editTarget}>
                <input type="text" required={!!editTarget} value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  disabled={!editTarget}
                  className={INPUT_CLASS} placeholder={editTarget ? 'Ej: Espejo mágico' : 'Se completa desde el .zip'} />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Tipo">
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={INPUT_CLASS}>
                    <option value="fonema">Fonema</option>
                    <option value="silaba">Sílaba</option>
                    <option value="palabra">Palabra</option>
                    <option value="comprension">Comprensión</option>
                    <option value="otro">Otro</option>
                  </select>
                </Field>
                <Field label="Nivel de dificultad">
                  <select value={form.difficultyLevel} onChange={(e) => setForm({ ...form, difficultyLevel: Number(e.target.value) })} className={INPUT_CLASS}>
                    <option value={1}>1 — Básico</option>
                    <option value={2}>2 — Intermedio</option>
                    <option value={3}>3 — Avanzado</option>
                  </select>
                </Field>
              </div>

              <Field label="Objetivo terapéutico">
                <textarea rows={2} value={form.therapeuticGoal}
                  onChange={(e) => setForm({ ...form, therapeuticGoal: e.target.value })}
                  className={INPUT_CLASS} placeholder="Ej: Mejorar la pronunciación del fonema /r/" />
              </Field>

              <div className="grid grid-cols-3 gap-4">
                <Field label="Edad mínima">
                  <input type="number" min={2} max={18} value={form.ageMin}
                    onChange={(e) => setForm({ ...form, ageMin: e.target.value })}
                    className={INPUT_CLASS} placeholder="4" />
                </Field>
                <Field label="Edad máxima">
                  <input type="number" min={2} max={18} value={form.ageMax}
                    onChange={(e) => setForm({ ...form, ageMax: e.target.value })}
                    className={INPUT_CLASS} placeholder="10" />
                </Field>
                <Field label="Duración (min)">
                  <input type="number" min={1} max={120} value={form.durationMinutes}
                    onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                    className={INPUT_CLASS} placeholder="15" />
                </Field>
              </div>

              <Field label="URL thumbnail (placeholder)">
                <input type="text" value={form.thumbnailUrl}
                  onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
                  className={INPUT_CLASS} placeholder="https://..." />
              </Field>

              {!editTarget ? (
                <Field label="Archivo del juego (.zip)" required>
                  <input
                    type="file"
                    accept=".zip,application/zip"
                    required
                    onChange={(e) => setBundleFile(e.target.files?.[0] || null)}
                    className={INPUT_CLASS}
                  />
                  <p className="font-body text-xs text-text-soft mt-1">
                    Sube el .zip exportado por el Engine. El título, la edad y la duración se toman del manifest.
                  </p>
                </Field>
              ) : (
                <Field label="Reemplazar bundle del juego">
                  <input
                    type="file"
                    accept=".zip,application/zip"
                    onChange={(e) => setBundleFile(e.target.files?.[0] || null)}
                    className={INPUT_CLASS}
                  />
                  {bundleFile && (
                    <div className="mt-2 flex items-center gap-3">
                      <span className="font-body text-xs text-text-soft truncate max-w-[180px]">{bundleFile.name}</span>
                      <button
                        type="button"
                        onClick={() => handleReplaceBundle(bundleFile)}
                        className="font-body text-xs text-white bg-primary rounded-lg px-4 py-2 hover:opacity-90 transition"
                      >
                        Confirmar reemplazo de bundle
                      </button>
                    </div>
                  )}
                  <p className="font-body text-xs text-text-soft mt-1">
                    Versión actual: {editTarget.gameVersion || '—'}. Subir un .zip reemplaza el juego (mismo gameId).
                  </p>
                </Field>
              )}

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.availableToTutors}
                  onChange={(e) => setForm({ ...form, availableToTutors: e.target.checked })}
                  className="w-4 h-4 accent-primary" />
                <span className="font-body text-sm text-text-strong">Disponible para tutores</span>
              </label>

              {error && <p className="font-body text-sm text-red-500">{error}</p>}
              {errorDetails.length > 0 && (
                <ul className="font-body text-xs text-red-500 list-disc pl-5 space-y-0.5">
                  {errorDetails.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 bg-surface text-text-strong font-heading font-semibold rounded-xl px-6 py-3 hover:bg-text-soft/10 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-primary text-white font-heading font-semibold rounded-xl px-6 py-3 hover:opacity-90 transition disabled:opacity-60">
                  {submitting ? 'Guardando...' : editTarget ? 'Guardar cambios' : 'Crear actividad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const INPUT_CLASS = 'w-full border border-text-soft/20 rounded-xl px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary';

function Field({ label, required, children }) {
  return (
    <div>
      <label className="font-body text-sm font-medium text-text-strong block mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
