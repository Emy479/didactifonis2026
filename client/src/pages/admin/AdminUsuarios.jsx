import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../config';

const ROL_LABEL = { tutor: 'Tutor', profesional: 'Profesional', admin: 'Admin' };
const ROL_COLOR = {
  tutor: 'bg-accent/10 text-accent',
  profesional: 'bg-primary/10 text-primary',
  admin: 'bg-creative/10 text-creative',
};

export default function AdminUsuarios() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  const token = localStorage.getItem('auth_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const roleParam = filterRole ? `&role=${filterRole}` : '';
      const [usersRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/users?page=${page}&limit=${LIMIT}${roleParam}`, { headers }),
        fetch(`${API_URL}/api/admin/stats`, { headers }),
      ]);
      const usersData = await usersRes.json();
      const statsData = await statsRes.json();
      setUsers(usersData.users || []);
      setTotal(usersData.total || 0);
      setStats(statsData);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, [page, filterRole]);

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
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold text-text-strong">Usuarios</h1>
        <p className="font-body text-sm text-text-soft mt-1">Gestiona todos los usuarios de la plataforma</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total usuarios" value={stats?.users?.total ?? 0} color="text-primary" />
        <KpiCard label="Profesionales" value={stats?.users?.byRole?.profesional ?? 0} color="text-accent" />
        <KpiCard label="Padres / Tutores" value={stats?.users?.byRole?.tutor ?? 0} color="text-creative" />
        <KpiCard label="Administradores" value={stats?.users?.byRole?.admin ?? 0} color="text-energy" />
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap gap-3 mb-5 items-center justify-between">
          <div className="flex gap-2">
            {['', 'tutor', 'profesional', 'admin'].map((r) => (
              <button
                key={r}
                onClick={() => { setFilterRole(r); setPage(1); }}
                className={`font-body text-sm px-4 py-1.5 rounded-full border transition ${
                  filterRole === r
                    ? 'bg-primary text-white border-primary'
                    : 'text-text-soft border-text-soft/20 hover:border-primary hover:text-primary'
                }`}
              >
                {r === '' ? 'Todos' : ROL_LABEL[r]}
              </button>
            ))}
          </div>
          <p className="font-body text-sm text-text-soft">{total} usuarios</p>
        </div>

        {loading ? (
          <p className="font-body text-sm text-text-soft py-4">Cargando...</p>
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
                  <th className="font-body text-xs text-text-soft font-medium pb-3">Registro</th>
                  <th className="font-body text-xs text-text-soft font-medium pb-3">Estado</th>
                  <th className="font-body text-xs text-text-soft font-medium pb-3">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-surface/50 transition">
                    <td className="py-3 font-body text-sm text-text-strong">{u.name}</td>
                    <td className="py-3 font-body text-sm text-text-soft">{u.email}</td>
                    <td className="py-3">
                      <span className={`font-body text-xs px-2.5 py-1 rounded-full font-medium ${ROL_COLOR[u.role] || 'bg-surface text-text-soft'}`}>
                        {ROL_LABEL[u.role] || u.role}
                      </span>
                    </td>
                    <td className="py-3 font-body text-sm text-text-soft">
                      {new Date(u.createdAt).toLocaleDateString('es-CL')}
                    </td>
                    <td className="py-3">
                      <span className={`font-body text-xs px-2.5 py-1 rounded-full ${u.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3">
                      {u.role !== 'admin' && (
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
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex gap-2 mt-4 items-center justify-end">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="font-body text-sm px-3 py-1.5 rounded-xl border border-text-soft/20 disabled:opacity-40 hover:border-primary hover:text-primary transition"
                >
                  Anterior
                </button>
                <span className="font-body text-sm text-text-soft">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="font-body text-sm px-3 py-1.5 rounded-xl border border-text-soft/20 disabled:opacity-40 hover:border-primary hover:text-primary transition"
                >
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

function KpiCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <p className="font-body text-xs text-text-soft mb-2">{label}</p>
      <p className={`font-heading text-3xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}
