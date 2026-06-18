import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../lib/apiFetch.js';

const STATUS_LABEL = { active: 'Activa', completed: 'Completada', review: 'En revisión' };
const STATUS_COLOR = {
  active: 'bg-green-50 text-green-600',
  completed: 'bg-primary/10 text-primary',
  review: 'bg-optimism/20 text-yellow-700',
};

export default function AdminTerapias() {
  const [therapies, setTherapies] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const LIMIT = 15;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = filterStatus ? `&status=${filterStatus}` : '';
      const res = await apiFetch(
        `/api/admin/therapies?page=${page}&limit=${LIMIT}${statusParam}`
      );
      const data = await res.json();
      setTherapies(data.therapies || []);
      setTotal(data.total || 0);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, [page, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold text-text-strong">Terapias</h1>
        <p className="font-body text-sm text-text-soft mt-1">Supervisa todas las terapias activas en la plataforma</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="font-body text-xs text-text-soft mb-2">Total terapias</p>
          <p className="font-heading text-3xl font-semibold text-primary">{total}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="font-body text-xs text-text-soft mb-2">Activas</p>
          <p className="font-heading text-3xl font-semibold text-green-500">
            {therapies.filter((t) => t.status === 'active').length}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="font-body text-xs text-text-soft mb-2">En revisión</p>
          <p className="font-heading text-3xl font-semibold text-yellow-600">
            {therapies.filter((t) => t.status === 'review').length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap gap-3 mb-5 items-center justify-between">
          <div className="flex gap-2">
            {['', 'active', 'completed', 'review'].map((s) => (
              <button key={s}
                onClick={() => { setFilterStatus(s); setPage(1); }}
                className={`font-body text-sm px-4 py-1.5 rounded-full border transition ${
                  filterStatus === s
                    ? 'bg-primary text-white border-primary'
                    : 'text-text-soft border-text-soft/20 hover:border-primary hover:text-primary'
                }`}
              >
                {s === '' ? 'Todas' : STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <p className="font-body text-sm text-text-soft">{total} terapias</p>
        </div>

        {loading ? (
          <p className="font-body text-sm text-text-soft">Cargando...</p>
        ) : therapies.length === 0 ? (
          <p className="font-body text-sm text-text-soft py-4">Sin terapias en esta categoría.</p>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-surface">
                  <th className="font-body text-xs text-text-soft font-medium pb-3">Terapia</th>
                  <th className="font-body text-xs text-text-soft font-medium pb-3">Paciente</th>
                  <th className="font-body text-xs text-text-soft font-medium pb-3">Profesional</th>
                  <th className="font-body text-xs text-text-soft font-medium pb-3">Sesiones</th>
                  <th className="font-body text-xs text-text-soft font-medium pb-3">Inicio</th>
                  <th className="font-body text-xs text-text-soft font-medium pb-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface">
                {therapies.map((t) => (
                  <tr key={t._id} className="hover:bg-surface/50 transition">
                    <td className="py-3 font-body text-sm text-text-strong max-w-xs truncate">{t.name}</td>
                    <td className="py-3 font-body text-sm text-text-soft">{t.childId?.name || '—'}</td>
                    <td className="py-3 font-body text-sm text-text-soft">{t.professionalId?.name || '—'}</td>
                    <td className="py-3 font-body text-sm text-text-soft">{t.sessions}</td>
                    <td className="py-3 font-body text-sm text-text-soft">
                      {t.startDate ? new Date(t.startDate).toLocaleDateString('es-CL') : '—'}
                    </td>
                    <td className="py-3">
                      <span className={`font-body text-xs px-2.5 py-1 rounded-full ${STATUS_COLOR[t.status] || 'bg-surface text-text-soft'}`}>
                        {STATUS_LABEL[t.status] || t.status}
                      </span>
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
    </div>
  );
}
