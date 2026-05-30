import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function BadgeEstado({ estado }) {
  const estilos = {
    pending:  'bg-optimism/20 text-yellow-700',
    accepted: 'bg-green-100 text-green-700',
    rejected: 'bg-surface text-text-soft',
    expired:  'bg-energy/20 text-energy',
    revoked:  'bg-red-100 text-red-700',
  };
  const etiquetas = {
    pending:  'Pendiente',
    accepted: 'Aceptada',
    rejected: 'Rechazada',
    expired:  'Expirada',
    revoked:  'Revocada',
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full font-body text-xs font-semibold ${estilos[estado] || 'bg-surface text-text-soft'}`}>
      {etiquetas[estado] || estado}
    </span>
  );
}

function CopiarBoton({ texto }) {
  const [copiado, setCopiado] = useState(false);
  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // ignorar error de clipboard
    }
  };
  return (
    <button
      onClick={handleCopiar}
      className="font-body text-xs text-accent hover:underline ml-2 whitespace-nowrap"
    >
      {copiado ? 'Copiado' : 'Copiar'}
    </button>
  );
}

// ── Tab: Mis invitaciones ─────────────────────────────────────────────────────

function TabMisInvitaciones() {
  const [invitaciones, setInvitaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [pacientes, setPacientes] = useState([]);
  const [childIdSeleccionado, setChildIdSeleccionado] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorModal, setErrorModal] = useState(null);

  const [tokenGenerado, setTokenGenerado] = useState(null);

  const cargarInvitaciones = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/link/invitations`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Error al cargar invitaciones');
      const data = await res.json();
      setInvitaciones(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  const cargarPacientes = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/professional/patients`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Error al cargar pacientes');
      const data = await res.json();
      setPacientes(Array.isArray(data) ? data : []);
    } catch {
      setPacientes([]);
    }
  }, []);

  useEffect(() => {
    cargarInvitaciones();
  }, [cargarInvitaciones]);

  const abrirModal = () => {
    setErrorModal(null);
    setChildIdSeleccionado('');
    cargarPacientes();
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setErrorModal(null);
  };

  const handleCrearInvitacion = async () => {
    if (!childIdSeleccionado) {
      setErrorModal('Selecciona un paciente.');
      return;
    }
    setEnviando(true);
    setErrorModal(null);
    try {
      const res = await fetch(`${API_URL}/api/link/invite`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ childId: childIdSeleccionado }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al crear invitación');
      setModalAbierto(false);
      setTokenGenerado(data.token);
      cargarInvitaciones();
    } catch (err) {
      setErrorModal(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const formatFecha = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <p className="font-body text-sm text-text-soft">
          {invitaciones.length} invitacion{invitaciones.length !== 1 ? 'es' : ''}
        </p>
        <button
          onClick={abrirModal}
          className="bg-accent text-white font-heading font-semibold rounded-xl px-4 py-2 text-sm hover:opacity-90 transition"
        >
          Nueva invitacion
        </button>
      </div>

      {cargando && <p className="font-body text-sm text-text-soft">Cargando invitaciones...</p>}
      {error && <p className="font-body text-sm text-red-600">{error}</p>}

      {!cargando && !error && invitaciones.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl">
          <p className="font-body text-text-soft mb-1">No tienes invitaciones generadas.</p>
          <p className="font-body text-sm text-text-soft/70">Crea una invitacion para vincular a un tutor con uno de tus pacientes.</p>
        </div>
      )}

      {!cargando && invitaciones.length > 0 && (
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-surface">
                <th className="font-heading text-xs text-text-soft px-5 py-3 font-semibold uppercase tracking-wide">Paciente</th>
                <th className="font-heading text-xs text-text-soft px-5 py-3 font-semibold uppercase tracking-wide">Tutor</th>
                <th className="font-heading text-xs text-text-soft px-5 py-3 font-semibold uppercase tracking-wide">Estado</th>
                <th className="font-heading text-xs text-text-soft px-5 py-3 font-semibold uppercase tracking-wide">Expira</th>
                <th className="font-heading text-xs text-text-soft px-5 py-3 font-semibold uppercase tracking-wide">Token</th>
              </tr>
            </thead>
            <tbody>
              {invitaciones.map((inv) => (
                <tr key={inv._id} className="border-b border-surface last:border-0 hover:bg-surface/50 transition">
                  <td className="px-5 py-3 font-body text-sm text-text-strong">
                    {inv.childId?.name || '—'}
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-body text-sm text-text-strong">{inv.tutorId?.name || '—'}</p>
                    <p className="font-body text-xs text-text-soft">{inv.tutorId?.email || ''}</p>
                  </td>
                  <td className="px-5 py-3">
                    <BadgeEstado estado={inv.status} />
                  </td>
                  <td className="px-5 py-3 font-body text-sm text-text-soft">
                    {formatFecha(inv.expiresAt)}
                  </td>
                  <td className="px-5 py-3">
                    {inv.status === 'pending' && inv.token ? (
                      <div className="flex items-center gap-1">
                        <code className="font-body text-xs bg-surface px-2 py-0.5 rounded text-text-strong">
                          {inv.token}
                        </code>
                        <CopiarBoton texto={inv.token} />
                      </div>
                    ) : (
                      <span className="font-body text-xs text-text-soft">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal seleccion de paciente */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-lg">
            <h3 className="font-heading text-lg font-semibold text-text-strong mb-5">Nueva invitacion</h3>
            <label className="font-body text-sm font-medium text-text-strong block mb-2">
              Selecciona un paciente
            </label>
            <select
              value={childIdSeleccionado}
              onChange={(e) => setChildIdSeleccionado(e.target.value)}
              className="w-full border border-text-soft/20 rounded-xl px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-accent mb-4"
            >
              <option value="">-- Elige un paciente --</option>
              {pacientes.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
            {errorModal && <p className="font-body text-sm text-red-600 mb-3">{errorModal}</p>}
            <div className="flex gap-3">
              <button
                onClick={cerrarModal}
                disabled={enviando}
                className="flex-1 bg-surface text-text-strong font-heading font-semibold rounded-xl px-4 py-2.5 hover:bg-text-soft/10 transition text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearInvitacion}
                disabled={enviando}
                className="flex-1 bg-accent text-white font-heading font-semibold rounded-xl px-4 py-2.5 hover:opacity-90 transition text-sm disabled:opacity-60"
              >
                {enviando ? 'Generando...' : 'Generar invitacion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal token generado */}
      {tokenGenerado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-lg">
            <h3 className="font-heading text-lg font-semibold text-text-strong mb-2">Invitacion generada</h3>
            <p className="font-body text-sm text-text-soft mb-5">
              Comparte este token con el tutor del paciente para completar la vinculacion.
            </p>
            <div className="bg-surface rounded-xl p-4 mb-4 flex items-center gap-3">
              <code className="font-body text-sm text-text-strong flex-1 break-all">{tokenGenerado}</code>
              <CopiarBoton texto={tokenGenerado} />
            </div>
            <button
              onClick={() => setTokenGenerado(null)}
              className="w-full bg-accent text-white font-heading font-semibold rounded-xl px-4 py-2.5 hover:opacity-90 transition text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Solicitudes recibidas ────────────────────────────────────────────────

function TabSolicitudesRecibidas() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [procesando, setProcesando] = useState({});

  const cargarSolicitudes = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/professionals/incoming`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Error al cargar solicitudes');
      const data = await res.json();
      setSolicitudes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarSolicitudes();
  }, [cargarSolicitudes]);

  const responder = async (invitationId, decision) => {
    setProcesando((prev) => ({ ...prev, [invitationId]: true }));
    try {
      const res = await fetch(`${API_URL}/api/professionals/respond`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ invitationId, decision }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al procesar la solicitud');
      }
      cargarSolicitudes();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcesando((prev) => ({ ...prev, [invitationId]: false }));
    }
  };

  const formatFecha = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (cargando) return <p className="font-body text-sm text-text-soft">Cargando solicitudes...</p>;
  if (error) return <p className="font-body text-sm text-red-600">{error}</p>;

  if (solicitudes.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl">
        <p className="font-body text-text-soft">No tienes solicitudes pendientes.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {solicitudes.map((sol) => (
        <div key={sol._id} className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-5">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-heading font-semibold text-primary text-sm flex-shrink-0">
            {sol.childId?.name?.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-body text-sm font-semibold text-text-strong">{sol.childId?.name || 'Paciente'}</p>
            <p className="font-body text-xs text-text-soft">
              Tutor: {sol.tutorId?.name || '—'} &middot; {sol.tutorId?.email || ''}
            </p>
            <p className="font-body text-xs text-text-soft mt-0.5">Solicitud: {formatFecha(sol.createdAt)}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => responder(sol._id, 'rejected')}
              disabled={!!procesando[sol._id]}
              className="font-body text-sm text-text-soft border border-text-soft/20 rounded-xl px-4 py-2 hover:bg-surface transition disabled:opacity-50"
            >
              Rechazar
            </button>
            <button
              onClick={() => responder(sol._id, 'accepted')}
              disabled={!!procesando[sol._id]}
              className="font-body text-sm text-white bg-primary rounded-xl px-4 py-2 hover:opacity-90 transition disabled:opacity-50"
            >
              {procesando[sol._id] ? 'Procesando...' : 'Aceptar'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function InvitacionesPro() {
  const [tabActivo, setTabActivo] = useState('mis-invitaciones');

  const tabs = [
    { id: 'mis-invitaciones',   label: 'Mis invitaciones' },
    { id: 'solicitudes',        label: 'Solicitudes recibidas' },
  ];

  return (
    <div className="p-8">
      <h1 className="font-heading text-2xl font-semibold text-text-strong mb-6">Invitaciones</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-surface">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTabActivo(tab.id)}
            className={`font-body text-sm px-5 py-2.5 transition border-b-2 -mb-px ${
              tabActivo === tab.id
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-text-soft hover:text-text-strong'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabActivo === 'mis-invitaciones' && <TabMisInvitaciones />}
      {tabActivo === 'solicitudes'      && <TabSolicitudesRecibidas />}
    </div>
  );
}
