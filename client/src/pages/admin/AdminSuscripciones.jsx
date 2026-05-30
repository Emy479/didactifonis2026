import { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const STATUS_LABEL = { active: 'Activa', trial: 'Prueba', expired: 'Expirada', none: 'Sin plan' };
const STATUS_COLOR = {
  active: 'bg-green-50 text-green-600',
  trial: 'bg-optimism/20 text-yellow-700',
  expired: 'bg-red-50 text-red-500',
  none: 'bg-surface text-text-soft',
};
const ROL_LABEL = { tutor: 'Tutor', profesional: 'Profesional', admin: 'Admin' };

export default function AdminSuscripciones() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  const token = localStorage.getItem('auth_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/admin/users?page=${page}&limit=${LIMIT}`,
        { headers }
      );
      const data = await res.json();
      let all = data.users || [];
      if (filterStatus) {
        all = all.filter((u) => (u.subscription?.status || 'none') === filterStatus);
      }
      setUsers(all);
      setTotal(data.total || 0);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, [page, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(total / LIMIT);

  const counts = {
    active: users.filter((u) => u.subscription?.status === 'active').length,
    trial: users.filter((u) => u.subscription?.status === 'trial').length,
    expired: users.filter((u) => u.subscription?.status === 'expired').length,
    none: users.filter((u) => !u.subscription?.status || u.subscription?.status === 'none').length,
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold text-text-strong">Suscripciones</h1>
        <p className="font-body text-sm text-text-soft mt-1">Estado de suscripciones de los usuarios</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="font-body text-xs text-text-soft mb-2">Activas</p>
          <p className="font-heading text-3xl font-semibold text-green-500">{counts.active}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="font-body text-xs text-text-soft mb-2">En prueba</p>
          <p className="font-heading text-3xl font-semibold text-yellow-600">{counts.trial}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="font-body text-xs text-text-soft mb-2">Expiradas</p>
          <p className="font-heading text-3xl font-semibold text-red-500">{counts.expired}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="font-body text-xs text-text-soft mb-2">Sin plan</p>
          <p className="font-heading text-3xl font-semibold text-text-soft">{counts.none}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap gap-3 mb-5 items-center justify-between">
          <div className="flex gap-2">
            {['', 'active', 'trial', 'expired', 'none'].map((s) => (
              <button key={s}
                onClick={() => { setFilterStatus(s); setPage(1); }}
                className={`font-body text-sm px-4 py-1.5 rounded-full border transition ${
                  filterStatus === s
                    ? 'bg-primary text-white border-primary'
                    : 'text-text-soft border-text-soft/20 hover:border-primary hover:text-primary'
                }`}
              >
                {s === '' ? 'Todas' : STATUS_LABEL[s] || s}
              </button>
            ))}
          </div>
          <p className="font-body text-sm text-text-soft">{total} usuarios</p>
        </div>

        {loading ? (
          <p className="font-body text-sm text-text-soft">Cargando...</p>
        ) : users.length === 0 ? (
          <p className="font-body text-sm text-text-soft py-4">Sin usuarios en esta categoría.</p>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-surface">
                  <th className="font-body text-xs text-text-soft font-medium pb-3">Nombre</th>
                  <th className="font-body text-xs text-text-soft font-medium pb-3">Email</th>
                  <th className="font-body text-xs text-text-soft font-medium pb-3">Rol</th>
                  <th className="font-body text-xs text-text-soft font-medium pb-3">Estado</th>
                  <th className="font-body text-xs text-text-soft font-medium pb-3">Inicio plan</th>
                  <th className="font-body text-xs text-text-soft font-medium pb-3">Vencimiento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-surface/50 transition">
                    <td className="py-3 font-body text-sm text-text-strong">{u.name}</td>
                    <td className="py-3 font-body text-sm text-text-soft">{u.email}</td>
                    <td className="py-3 font-body text-sm text-text-soft">{ROL_LABEL[u.role] || u.role}</td>
                    <td className="py-3">
                      <span className={`font-body text-xs px-2.5 py-1 rounded-full ${STATUS_COLOR[u.subscription?.status || 'none']}`}>
                        {STATUS_LABEL[u.subscription?.status] || 'Sin plan'}
                      </span>
                    </td>
                    <td className="py-3 font-body text-sm text-text-soft">
                      {u.subscription?.planStartedAt
                        ? new Date(u.subscription.planStartedAt).toLocaleDateString('es-CL')
                        : '—'}
                    </td>
                    <td className="py-3 font-body text-sm text-text-soft">
                      {u.subscription?.planExpiresAt
                        ? new Date(u.subscription.planExpiresAt).toLocaleDateString('es-CL')
                        : u.subscription?.trialEndsAt
                        ? new Date(u.subscription.trialEndsAt).toLocaleDateString('es-CL') + ' (prueba)'
                        : '—'}
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

      <div className="mt-4 bg-optimism/10 border border-optimism/30 rounded-2xl p-4">
        <p className="font-body text-sm text-yellow-800">
          La integración con Transbank / Webpay Plus está pendiente. Los datos de pago reales y facturación electrónica (SII) se habilitan una vez completada la afiliación.
        </p>
      </div>
    </div>
  );
}
