import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../config';

export default function AdminPadresTutores() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  const token = localStorage.getItem('auth_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/admin/users?role=tutor&page=${page}&limit=${LIMIT}`,
        { headers }
      );
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleStatus = async (userId, currentStatus) => {
    try {
      await fetch(`${API_URL}/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      fetchData();
    } catch { /* silencioso */ }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold text-text-strong">Padres / Tutores</h1>
        <p className="font-body text-sm text-text-soft mt-1">Gestiona todos los padres y tutores de la plataforma</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="font-body text-xs text-text-soft mb-2">Total tutores</p>
          <p className="font-heading text-3xl font-semibold text-accent">{total}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="font-body text-xs text-text-soft mb-2">Activos</p>
          <p className="font-heading text-3xl font-semibold text-primary">
            {users.filter((u) => u.isActive).length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-heading text-base font-semibold text-text-strong">Lista de tutores</h2>
          <p className="font-body text-sm text-text-soft">{total} registros</p>
        </div>

        {loading ? (
          <p className="font-body text-sm text-text-soft">Cargando...</p>
        ) : users.length === 0 ? (
          <p className="font-body text-sm text-text-soft">Sin tutores registrados.</p>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-surface">
                  <th className="font-body text-xs text-text-soft font-medium pb-3">Nombre</th>
                  <th className="font-body text-xs text-text-soft font-medium pb-3">Email</th>
                  <th className="font-body text-xs text-text-soft font-medium pb-3">Registro</th>
                  <th className="font-body text-xs text-text-soft font-medium pb-3">Suscripción</th>
                  <th className="font-body text-xs text-text-soft font-medium pb-3">Estado</th>
                  <th className="font-body text-xs text-text-soft font-medium pb-3">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-surface/50 transition">
                    <td className="py-3 font-body text-sm text-text-strong">{u.name}</td>
                    <td className="py-3 font-body text-sm text-text-soft">{u.email}</td>
                    <td className="py-3 font-body text-sm text-text-soft">
                      {new Date(u.createdAt).toLocaleDateString('es-CL')}
                    </td>
                    <td className="py-3">
                      <span className={`font-body text-xs px-2.5 py-1 rounded-full capitalize ${
                        u.subscription?.status === 'active' ? 'bg-green-50 text-green-600' :
                        u.subscription?.status === 'trial'  ? 'bg-optimism/20 text-yellow-700' :
                        'bg-surface text-text-soft'
                      }`}>
                        {u.subscription?.status || 'none'}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`font-body text-xs px-2.5 py-1 rounded-full ${u.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => toggleStatus(u._id, u.isActive)}
                        className={`font-body text-xs px-3 py-1.5 rounded-xl border transition ${
                          u.isActive
                            ? 'border-red-200 text-red-500 hover:bg-red-50'
                            : 'border-green-200 text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {u.isActive ? 'Desactivar' : 'Activar'}
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
    </div>
  );
}
