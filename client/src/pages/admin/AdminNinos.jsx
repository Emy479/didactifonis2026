import { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const AVATAR_MAP = {
  'nino-1': { emoji: '👦', label: 'Niño' },
  'nino-2': { emoji: '🧒', label: 'Niño' },
  'nina-1': { emoji: '👧', label: 'Niña' },
  'nina-2': { emoji: '🧑', label: 'Niña' },
};

function calcEdad(birthDate) {
  if (!birthDate) return '—';
  const hoy = new Date();
  const nac = new Date(birthDate);
  const edad = hoy.getFullYear() - nac.getFullYear();
  return `${edad} años`;
}

export default function AdminNinos() {
  const [children, setChildren] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  const token = localStorage.getItem('auth_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/children?page=${page}&limit=${LIMIT}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setChildren(data.children || []);
        setTotal(data.total || 0);
      }
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold text-text-strong">Niños</h1>
        <p className="font-body text-sm text-text-soft mt-1">Perfiles de todos los niños registrados en la plataforma</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="font-body text-xs text-text-soft mb-2">Total niños</p>
          <p className="font-heading text-3xl font-semibold text-primary">{total}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="font-body text-xs text-text-soft mb-2">Activos</p>
          <p className="font-heading text-3xl font-semibold text-accent">
            {children.filter((c) => c.isActive).length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-heading text-base font-semibold text-text-strong">Lista de niños</h2>
          <p className="font-body text-sm text-text-soft">{total} registros</p>
        </div>

        {loading ? (
          <p className="font-body text-sm text-text-soft">Cargando...</p>
        ) : children.length === 0 ? (
          <p className="font-body text-sm text-text-soft">Sin niños registrados.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-surface">
                <th className="font-body text-xs text-text-soft font-medium pb-3">Nombre</th>
                <th className="font-body text-xs text-text-soft font-medium pb-3">Edad</th>
                <th className="font-body text-xs text-text-soft font-medium pb-3">Tutor</th>
                <th className="font-body text-xs text-text-soft font-medium pb-3">Vinculaciones</th>
                <th className="font-body text-xs text-text-soft font-medium pb-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface">
              {children.map((c) => {
                const avatar = AVATAR_MAP[c.avatarId] || { emoji: '🧒', label: 'Niño' };
                return (
                  <tr key={c._id} className="hover:bg-surface/50 transition">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{avatar.emoji}</span>
                        <span className="font-body text-sm text-text-strong">{c.name}</span>
                      </div>
                    </td>
                    <td className="py-3 font-body text-sm text-text-soft">{calcEdad(c.birthDate)}</td>
                    <td className="py-3 font-body text-sm text-text-soft">
                      {c.tutorId?.name || (typeof c.tutorId === 'string' ? '—' : '—')}
                    </td>
                    <td className="py-3 font-body text-sm text-text-soft">
                      {c.accessGrants?.length || 0} profesional{c.accessGrants?.length !== 1 ? 'es' : ''}
                    </td>
                    <td className="py-3">
                      <span className={`font-body text-xs px-2.5 py-1 rounded-full ${c.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                        {c.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
