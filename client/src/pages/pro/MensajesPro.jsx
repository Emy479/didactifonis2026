import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/apiFetch.js';

const POLL_INTERVAL = 8000;

function fechaRelativa(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h`;
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
}

function horaFormato(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

// Firma ligera de la lista de conversaciones para detectar cualquier cambio
// (nueva conv, mensaje nuevo en cualquier posición, cambio de badge noLeidos).
function firmaConversaciones(lista) {
  return lista
    .map((c) => `${c.invitation?._id}:${c.ultimoMensaje?._id ?? ''}:${c.noLeidos ?? 0}`)
    .join('|');
}

// ── Lista de conversaciones ───────────────────────────────────────────────────

function ListaConversaciones({ conversaciones, cargando, error, seleccionada, onSeleccionar }) {
  if (cargando) {
    return (
      <div className="p-6">
        <p className="font-body text-sm text-text-soft">Cargando conversaciones...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="font-body text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (conversaciones.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center text-center h-full justify-center">
        <p className="font-body text-sm text-text-soft leading-relaxed">
          No tienes conversaciones activas. Los mensajes se activan cuando un tutor acepta tu invitacion.
        </p>
      </div>
    );
  }

  return (
    <ul>
      {conversaciones.map((conv) => {
        const activo = seleccionada?._id === conv.invitation._id;
        return (
          <li key={conv.invitation._id}>
            <button
              onClick={() => onSeleccionar(conv)}
              className={`w-full text-left px-4 py-4 border-b border-surface transition hover:bg-surface/70 ${
                activo ? 'bg-accent/10' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center font-heading font-semibold text-accent text-sm flex-shrink-0">
                  {conv.invitation.tutorId?.name?.charAt(0) || 'T'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-body text-sm font-semibold text-text-strong truncate">
                      {conv.invitation.tutorId?.name || 'Tutor'}
                    </p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {conv.noLeidos > 0 && (
                        <span className="w-5 h-5 rounded-full bg-red-500 text-white font-body text-xs flex items-center justify-center">
                          {conv.noLeidos}
                        </span>
                      )}
                      <span className="font-body text-xs text-text-soft">
                        {fechaRelativa(conv.ultimoMensaje?.createdAt)}
                      </span>
                    </div>
                  </div>
                  <p className="font-body text-xs text-text-soft truncate mt-0.5">
                    Paciente: {conv.invitation.childId?.name || '—'}
                  </p>
                  {conv.ultimoMensaje && (
                    <p className="font-body text-xs text-text-soft truncate mt-0.5">
                      {conv.ultimoMensaje.content}
                    </p>
                  )}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ── Hilo de mensajes ──────────────────────────────────────────────────────────

function HiloMensajes({ convSeleccionada, userId }) {
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [inputTexto, setInputTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const bottomRef = useRef(null);

  const invitationId = convSeleccionada?.invitation?._id;

  // Carga inicial: muestra el spinner de "Cargando mensajes..."
  const cargarMensajes = useCallback(async () => {
    if (!invitationId) return;
    setCargando(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/messages/${invitationId}`);
      if (!res.ok) throw new Error('Error al cargar mensajes');
      const data = await res.json();
      setMensajes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [invitationId]);

  // Refresh silencioso: sin spinner, sin resetear input.
  // Solo actualiza el estado si llegaron mensajes nuevos (evita tirón de scroll
  // y re-renders innecesarios cuando no hay cambios).
  const refrescarMensajes = useCallback(async () => {
    if (!invitationId) return;
    if (document.hidden) return; // pausa cuando la pestaña está oculta
    try {
      const res = await apiFetch(`/api/messages/${invitationId}`);
      if (!res.ok) return; // fallo silencioso en polls
      const data = await res.json();
      if (!Array.isArray(data)) return;
      setMensajes((prev) => {
        // Compara longitud y _id del último mensaje para decidir si actualizar
        if (
          data.length === prev.length &&
          (data.length === 0 || data[data.length - 1]._id === prev[prev.length - 1]._id)
        ) {
          return prev; // sin cambio: devuelve la misma referencia, evita re-render
        }
        return data;
      });
    } catch {
      // fallo silencioso: no interrumpe la UX del usuario
    }
  }, [invitationId]);

  // Carga inicial al abrir una conversación
  useEffect(() => {
    setMensajes([]);
    setInputTexto('');
    setError(null);
    cargarMensajes();
  }, [cargarMensajes]);

  // Polling: un solo intervalo activo por conversación, limpiado al cambiar de hilo
  useEffect(() => {
    if (!invitationId) return;
    const id = setInterval(refrescarMensajes, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [invitationId, refrescarMensajes]);

  // Scroll al fondo cuando llegan mensajes nuevos (el efecto no se dispara si
  // setMensajes devolvió la misma referencia en el refresh silencioso)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  const handleEnviar = async () => {
    const content = inputTexto.trim();
    if (!content || enviando) return;
    setEnviando(true);
    const mensajePrevio = content;
    setInputTexto('');
    try {
      const res = await apiFetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId, content }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al enviar mensaje');
      }
      const nuevoMensaje = await res.json();
      setMensajes((prev) => [...prev, nuevoMensaje]);
    } catch (err) {
      setInputTexto(mensajePrevio);
      alert(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  if (!convSeleccionada) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="font-body text-sm text-text-soft">Selecciona una conversacion para ver los mensajes.</p>
      </div>
    );
  }

  const tutorNombre = convSeleccionada.invitation.tutorId?.name || 'Tutor';
  const pacienteNombre = convSeleccionada.invitation.childId?.name || '—';

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header del hilo */}
      <div className="px-6 py-4 border-b border-surface bg-white flex items-center gap-3 flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center font-heading font-semibold text-accent text-sm">
          {tutorNombre.charAt(0)}
        </div>
        <div>
          <p className="font-heading text-sm font-semibold text-text-strong">{tutorNombre}</p>
          <p className="font-body text-xs text-text-soft">Paciente: {pacienteNombre}</p>
        </div>
      </div>

      {/* Area de mensajes */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {cargando && <p className="font-body text-sm text-text-soft text-center">Cargando mensajes...</p>}
        {error && <p className="font-body text-sm text-red-600 text-center">{error}</p>}
        {!cargando && !error && mensajes.length === 0 && (
          <p className="font-body text-sm text-text-soft text-center">
            No hay mensajes en esta conversacion. Escribe el primero.
          </p>
        )}
        {mensajes.map((msg, idx) => {
          const esMio = String(msg.senderId) === String(userId) || msg.senderId?._id === userId;
          return (
            <div key={msg._id || idx} className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-xs lg:max-w-md">
                <div
                  className={`px-4 py-2.5 rounded-2xl font-body text-sm leading-relaxed ${
                    esMio
                      ? 'bg-accent text-white rounded-br-sm'
                      : 'bg-surface text-text-strong rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
                <p className={`font-body text-xs text-text-soft mt-1 ${esMio ? 'text-right' : 'text-left'}`}>
                  {horaFormato(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input de envio */}
      <div className="px-6 py-4 border-t border-surface bg-white flex-shrink-0">
        <div className="flex gap-3 items-end">
          <textarea
            value={inputTexto}
            onChange={(e) => setInputTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            rows={1}
            className="flex-1 border border-text-soft/20 rounded-xl px-4 py-2.5 font-body text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          />
          <button
            onClick={handleEnviar}
            disabled={!inputTexto.trim() || enviando}
            className="bg-accent text-white font-heading font-semibold rounded-xl px-5 py-2.5 text-sm hover:opacity-90 transition disabled:opacity-50 whitespace-nowrap"
          >
            {enviando ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function MensajesPro() {
  const { user } = useAuth();
  const [conversaciones, setConversaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [convSeleccionada, setConvSeleccionada] = useState(null);

  // Carga inicial: activa el spinner de "Cargando conversaciones..."
  const cargarConversaciones = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await apiFetch('/api/messages/conversations');
      if (!res.ok) throw new Error('Error al cargar conversaciones');
      const data = await res.json();
      setConversaciones(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  // Refresh silencioso de conversaciones: actualiza badges y último mensaje
  // sin activar el spinner ni provocar parpadeo en la lista.
  const refrescarConversaciones = useCallback(async () => {
    if (document.hidden) return; // pausa cuando la pestaña está oculta
    try {
      const res = await apiFetch('/api/messages/conversations');
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data)) return;
      setConversaciones((prev) =>
        firmaConversaciones(prev) === firmaConversaciones(data) ? prev : data
      );
    } catch {
      // fallo silencioso
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    cargarConversaciones();
  }, [cargarConversaciones]);

  // Polling de conversaciones (badges, último mensaje)
  useEffect(() => {
    const id = setInterval(refrescarConversaciones, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [refrescarConversaciones]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-5 border-b border-surface bg-white flex-shrink-0">
        <h1 className="font-heading text-2xl font-semibold text-text-strong">Mensajes</h1>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Columna izquierda */}
        <aside className="w-80 bg-white border-r border-surface flex flex-col flex-shrink-0 overflow-y-auto">
          <ListaConversaciones
            conversaciones={conversaciones}
            cargando={cargando}
            error={error}
            seleccionada={convSeleccionada?.invitation}
            onSeleccionar={setConvSeleccionada}
          />
        </aside>

        {/* Columna derecha */}
        <div className="flex-1 flex flex-col min-h-0 bg-white">
          <HiloMensajes
            convSeleccionada={convSeleccionada}
            userId={user?._id}
          />
        </div>
      </div>
    </div>
  );
}
