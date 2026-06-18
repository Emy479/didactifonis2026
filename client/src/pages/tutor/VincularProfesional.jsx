import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../config';

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ── Tab: Ingresar invitacion ──────────────────────────────────────────────────

function TabIngresarInvitacion() {
  const [tokenInput, setTokenInput] = useState('');
  const [childIdSeleccionado, setChildIdSeleccionado] = useState('');
  const [hijos, setHijos] = useState([]);
  const [cargandoHijos, setCargandoHijos] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(null);
  const [error, setError] = useState(null);

  const cargarHijos = useCallback(async () => {
    setCargandoHijos(true);
    try {
      const res = await fetch(`${API_URL}/api/children`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Error al cargar hijos');
      const data = await res.json();
      setHijos(Array.isArray(data) ? data : []);
    } catch {
      setHijos([]);
    } finally {
      setCargandoHijos(false);
    }
  }, []);

  useEffect(() => {
    cargarHijos();
  }, [cargarHijos]);

  const handleVincular = async () => {
    setError(null);
    setExito(null);
    if (!tokenInput.trim()) {
      setError('Ingresa el token de invitacion.');
      return;
    }
    if (!childIdSeleccionado) {
      setError('Selecciona el nino/a al que corresponde esta invitacion.');
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch(`${API_URL}/api/link/accept`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ token: tokenInput.trim(), consentVersion: '1.0' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al aceptar la invitacion');
      setExito(data);
      setTokenInput('');
      setChildIdSeleccionado('');
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="max-w-lg">
      <p className="font-body text-sm text-text-soft mb-6">
        Si un profesional te compartio un token de invitacion, ingressalo aqui para vincularlo con tu hijo/a.
      </p>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="mb-4">
          <label className="font-body text-sm font-medium text-text-strong block mb-2">
            Token de invitacion
          </label>
          <input
            type="text"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Pega el token aqui"
            className="w-full border border-text-soft/20 rounded-xl px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="mb-5">
          <label className="font-body text-sm font-medium text-text-strong block mb-2">
            Nino/a a vincular
          </label>
          {cargandoHijos ? (
            <p className="font-body text-sm text-text-soft">Cargando...</p>
          ) : hijos.length === 0 ? (
            <p className="font-body text-sm text-text-soft">No tienes ninos/as registrados.</p>
          ) : (
            <select
              value={childIdSeleccionado}
              onChange={(e) => setChildIdSeleccionado(e.target.value)}
              className="w-full border border-text-soft/20 rounded-xl px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">-- Selecciona un nino/a --</option>
              {hijos.map((h) => (
                <option key={h._id} value={h._id}>{h.name}</option>
              ))}
            </select>
          )}
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="font-body text-sm text-red-700">{error}</p>
          </div>
        )}

        {exito && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <p className="font-body text-sm text-green-700 font-semibold mb-0.5">Vinculacion exitosa</p>
            <p className="font-body text-sm text-green-700">
              Tu hijo/a ha sido vinculado con el profesional.
            </p>
          </div>
        )}

        <button
          onClick={handleVincular}
          disabled={enviando}
          className="w-full bg-accent text-white font-heading font-semibold rounded-xl px-4 py-2.5 hover:opacity-90 transition text-sm disabled:opacity-60"
        >
          {enviando ? 'Vinculando...' : 'Vincular'}
        </button>
      </div>
    </div>
  );
}

// ── Tab: Buscar profesional ───────────────────────────────────────────────────

function TabBuscarProfesional() {
  const [profesionales, setProfesionales] = useState([]);
  const [hijos, setHijos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [proSeleccionado, setProSeleccionado] = useState(null);
  const [childIdSeleccionado, setChildIdSeleccionado] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorModal, setErrorModal] = useState(null);
  const [exitoModal, setExitoModal] = useState(false);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [resPros, resHijos] = await Promise.all([
        fetch(`${API_URL}/api/directory`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/children`, { headers: getAuthHeaders() }),
      ]);
      if (!resPros.ok) throw new Error('Error al cargar profesionales');
      const [dataPros, dataHijos] = await Promise.all([resPros.json(), resHijos.ok ? resHijos.json() : []]);
      setProfesionales(Array.isArray(dataPros) ? dataPros : []);
      setHijos(Array.isArray(dataHijos) ? dataHijos : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const abrirModal = (pro) => {
    setProSeleccionado(pro);
    setChildIdSeleccionado('');
    setErrorModal(null);
    setExitoModal(false);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setProSeleccionado(null);
  };

  const handleSolicitar = async () => {
    if (!childIdSeleccionado) {
      setErrorModal('Selecciona un nino/a.');
      return;
    }
    setEnviando(true);
    setErrorModal(null);
    try {
      const res = await fetch(`${API_URL}/api/directory/request`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ professionalId: proSeleccionado._id, childId: childIdSeleccionado }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al enviar solicitud');
      setExitoModal(true);
    } catch (err) {
      setErrorModal(err.message);
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) return <p className="font-body text-sm text-text-soft">Cargando profesionales...</p>;
  if (error) return <p className="font-body text-sm text-red-600">{error}</p>;

  if (profesionales.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl">
        <p className="font-body text-text-soft">No hay profesionales disponibles en el directorio.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {profesionales.map((pro) => (
          <div key={pro._id} className="bg-white rounded-2xl p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-heading font-semibold text-primary text-sm flex-shrink-0">
                {pro.name?.charAt(0) || 'P'}
              </div>
              <div className="min-w-0">
                <p className="font-body text-sm font-semibold text-text-strong truncate">{pro.name}</p>
                {pro.especialidad && (
                  <p className="font-body text-xs text-text-soft truncate">{pro.especialidad}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => abrirModal(pro)}
              className="w-full border border-accent text-accent font-body text-sm rounded-xl px-4 py-2 hover:bg-accent/5 transition font-semibold"
            >
              Solicitar vinculacion
            </button>
          </div>
        ))}
      </div>

      {modalAbierto && proSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-lg">
            {!exitoModal ? (
              <>
                <h3 className="font-heading text-lg font-semibold text-text-strong mb-1">
                  Solicitar vinculacion
                </h3>
                <p className="font-body text-sm text-text-soft mb-5">
                  Con: {proSeleccionado.name}
                </p>
                <label className="font-body text-sm font-medium text-text-strong block mb-2">
                  Selecciona el nino/a
                </label>
                <select
                  value={childIdSeleccionado}
                  onChange={(e) => setChildIdSeleccionado(e.target.value)}
                  className="w-full border border-text-soft/20 rounded-xl px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-accent mb-4"
                >
                  <option value="">-- Elige un nino/a --</option>
                  {hijos.map((h) => (
                    <option key={h._id} value={h._id}>{h.name}</option>
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
                    onClick={handleSolicitar}
                    disabled={enviando}
                    className="flex-1 bg-accent text-white font-heading font-semibold rounded-xl px-4 py-2.5 hover:opacity-90 transition text-sm disabled:opacity-60"
                  >
                    {enviando ? 'Enviando...' : 'Enviar solicitud'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-heading text-lg font-semibold text-text-strong mb-2">Solicitud enviada</h3>
                <p className="font-body text-sm text-text-soft mb-5">
                  Tu solicitud fue enviada a {proSeleccionado.name}. El profesional recibira una notificacion y podra aceptarla o rechazarla.
                </p>
                <button
                  onClick={cerrarModal}
                  className="w-full bg-accent text-white font-heading font-semibold rounded-xl px-4 py-2.5 hover:opacity-90 transition text-sm"
                >
                  Cerrar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Vinculos activos ─────────────────────────────────────────────────────

function TabVinculosActivos() {
  const [hijos, setHijos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [revocando, setRevocando] = useState({});

  const cargarHijos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/children`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Error al cargar datos');
      const data = await res.json();
      setHijos(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarHijos();
  }, [cargarHijos]);

  const handleRevocar = async (childId, professionalId, key) => {
    if (!window.confirm('¿Confirmas que deseas revocar este vinculo?')) return;
    setRevocando((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch(`${API_URL}/api/link/revoke/${childId}/${professionalId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al revocar el vinculo');
      }
      cargarHijos();
    } catch (err) {
      alert(err.message);
    } finally {
      setRevocando((prev) => ({ ...prev, [key]: false }));
    }
  };

  if (cargando) return <p className="font-body text-sm text-text-soft">Cargando vinculos...</p>;
  if (error) return <p className="font-body text-sm text-red-600">{error}</p>;

  const hijosConVinculos = hijos.filter((h) => h.accessGrants && h.accessGrants.length > 0);

  if (hijosConVinculos.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl">
        <p className="font-body text-text-soft mb-1">No tienes vinculos activos.</p>
        <p className="font-body text-sm text-text-soft/70">Vincula un profesional desde las otras secciones.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hijosConVinculos.map((hijo) =>
        hijo.accessGrants.map((grant) => {
          const professionalId = grant._id || grant;
          const key = `${hijo._id}-${professionalId}`;
          return (
            <div key={key} className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center font-heading font-semibold text-accent text-sm flex-shrink-0">
                {hijo.name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm font-semibold text-text-strong">{hijo.name}</p>
                <p className="font-body text-xs text-text-soft">
                  Profesional vinculado: {grant.name || professionalId}
                </p>
              </div>
              <button
                onClick={() => handleRevocar(hijo._id, professionalId, key)}
                disabled={!!revocando[key]}
                className="font-body text-sm text-red-600 border border-red-200 rounded-xl px-4 py-2 hover:bg-red-50 transition disabled:opacity-50 whitespace-nowrap"
              >
                {revocando[key] ? 'Revocando...' : 'Revocar'}
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function VincularProfesional() {
  const [tabActivo, setTabActivo] = useState('ingresar');

  const tabs = [
    { id: 'ingresar',  label: 'Ingresar invitacion' },
    { id: 'buscar',    label: 'Buscar profesional' },
    { id: 'vinculos',  label: 'Vinculos activos' },
  ];

  return (
    <div className="p-8">
      <h1 className="font-heading text-2xl font-semibold text-text-strong mb-6">Vincular profesional</h1>

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

      {tabActivo === 'ingresar' && <TabIngresarInvitacion />}
      {tabActivo === 'buscar'   && <TabBuscarProfesional />}
      {tabActivo === 'vinculos' && <TabVinculosActivos />}
    </div>
  );
}
