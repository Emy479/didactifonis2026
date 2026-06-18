/**
 * GameHost.jsx — Launcher del niño (host del iframe del juego)
 *
 * FRENTE A de E2: custodia el sessionToken en memoria de React,
 * hospeda el bundle externo en un iframe sandboxed,
 * y maneja el protocolo postMessage host↔juego.
 *
 * GUARDRAILS DE SEGURIDAD (criterios de aceptación A.4):
 *   - sessionToken nunca cruza al iframe (ni por postMessage, ni por URL, ni por localStorage).
 *   - JWT del tutor nunca cruza al iframe.
 *   - getContext responde SOLO config+runtime del payload 2.A, jamás de ChildContext.
 *   - sandbox aplicado; event.origin validado en cada mensaje entrante.
 *
 * DEP-1 (resuelta): el backend propaga runtime.bundleUrl en el payload 2.A.
 * STUB_BUNDLE_URL se usa únicamente como fallback de desarrollo (import.meta.env.DEV)
 * cuando bundleUrl viene null. En producción, bundleUrl null pasa a fase ERROR.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EVENT_TYPES, CONTRACT_VERSION, EVENTS_INGEST_CAP } from '@didactifonis/contract';
import { API_URL } from '../../config';

/**
 * Fallback de desarrollo (DEP-1 resuelta).
 * Solo se usa cuando runtime.bundleUrl es null Y estamos en dev (import.meta.env.DEV).
 * En producción NUNCA se usa: bundleUrl null en prod deriva a fase ERROR.
 *
 * MEDIO-1: El stub vive en client/dev-stubs/sdk-stub.html (NO en /public) para no
 * quedar en dist/. Vite lo sirve en dev a través del middleware dev-stubs-middleware
 * definido en vite.config.js bajo la ruta /__dev-stubs/sdk-stub.html.
 */
const STUB_BUNDLE_URL = `${window.location.origin}/__dev-stubs/sdk-stub.html`;

// ── Fases del ciclo de vida del host ──────────────────────────────────────────
const PHASE = {
  LOADING:   'loading',   // arrancando sesión (POST /sessions)
  PLAYING:   'playing',   // iframe activo, juego en curso
  SUBMITTING:'submitting',// enviando resultados al servidor
  SUCCESS:   'success',   // resultados aceptados — mostrar feedback lúdico
  ERROR:     'error',     // error no recuperable
};

// ── Hook principal: toda la lógica del host ───────────────────────────────────
function useGameSession(assignmentId) {
  const [phase, setPhase]           = useState(PHASE.LOADING);
  const [sessionData, setSessionData] = useState(null); // payload 2.A (sin PII)
  const [bundleUrl, setBundleUrl]   = useState(null);
  const [errorMsg, setErrorMsg]     = useState('');

  // Buffer de eventos (en memoria; nunca a localStorage)
  const eventBuffer = useRef([]);
  // Referencia al iframe para validar origen
  const iframeRef   = useRef(null);
  // Origen esperado del bundle (calculado al conocer la URL)
  const expectedOriginRef = useRef(null);
  // Flag de ciclo de vida: abandoned si sale sin submitResults
  const completedRef = useRef(false);
  // Timestamp de inicio de sesión para durationSeconds
  const startTimeRef = useRef(null);

  // ── PASO 1: arrancar sesión ────────────────────────────────────────────────
  const startSession = useCallback(async () => {
    setPhase(PHASE.LOADING);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/activities/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assignmentId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Error ${res.status}`);
      }

      const payload = await res.json(); // payload 2.A
      // sessionToken se queda en payload — NUNCA sale de este scope hacia el iframe.
      setSessionData(payload);

      // DEP-1 (resuelta): resolver bundleUrl con guard prod/dev.
      //   1. Si el backend envía bundleUrl → usarla siempre.
      //   2. Si no viene y estamos en dev → fallback al stub local (solo dev).
      //   3. Si no viene y estamos en prod → pasar a ERROR con mensaje amable.
      const rawBundleUrl = payload.runtime?.bundleUrl;
      if (rawBundleUrl) {
        setBundleUrl(rawBundleUrl);
        try {
          expectedOriginRef.current = new URL(rawBundleUrl).origin;
        } catch {
          // URL relativa o malformada → usar origen propio
          expectedOriginRef.current = window.location.origin;
        }
        startTimeRef.current = Date.now();
        setPhase(PHASE.PLAYING);
      } else if (import.meta.env.DEV) {
        // Fallback de desarrollo: permite trabajar sin bundle configurado
        setBundleUrl(STUB_BUNDLE_URL);
        expectedOriginRef.current = window.location.origin;
        startTimeRef.current = Date.now();
        setPhase(PHASE.PLAYING);
      } else {
        // Producción sin bundle configurado: no montar el iframe
        setErrorMsg('Este juego todavía no está listo. ¡Vuelve a intentarlo más tarde!');
        setPhase(PHASE.ERROR);
      }
    } catch (err) {
      setErrorMsg(err.message || 'No pudimos iniciar la actividad. Intenta de nuevo.');
      setPhase(PHASE.ERROR);
    }
  }, [assignmentId]);

  // ── Emitir evento de ciclo de vida hacia el buffer ────────────────────────
  // (el juego emite sus propios eventos; el host emite los del ciclo de vida)
  const pushLifecycleEvent = useCallback((type) => {
    // Validar contra catálogo (warning en dev si desconocido — Q-EVT-3)
    if (!Object.values(EVENT_TYPES).includes(type)) {
      if (import.meta.env.DEV) {
        console.warn(`[GameHost] tipo de evento desconocido: "${type}" (se conserva como custom)`);
      }
    }
    eventBuffer.current.push({
      type,
      timestamp: new Date().toISOString(),
    });

    // Instrumentación del cap (A.6): loguear recuento en dev
    if (import.meta.env.DEV) {
      console.debug(
        `[GameHost] buffer eventos: ${eventBuffer.current.length} / cap=${EVENTS_INGEST_CAP}`
      );
    }
  }, []);

  // ── PASO 3A: responder getContext ──────────────────────────────────────────
  // GUARDRAIL: solo config+runtime del payload 2.A. NUNCA sessionToken, JWT, ni PII.
  const handleGetContext = useCallback((event) => {
    if (!sessionData) return;

    // El subconjunto seguro se construye SOLO del payload 2.A recibido del backend.
    // Jamás se añade nada de ChildContext (name, avatarId, etc.) — R3.
    const safeContext = {
      config: {
        level:               sessionData.config.level,
        passThreshold:       sessionData.config.passThreshold,
        locale:              sessionData.config.locale,
        params:              sessionData.config.params,
        audioInstructionsUrl:sessionData.config.audioInstructionsUrl,
        tutorInstructionsText:sessionData.config.tutorInstructionsText,
        // displayName: omitido aunque venga en payload (minimización PII en el SDK)
      },
      runtime: {
        maxDurationSeconds: sessionData.runtime.maxDurationSeconds,
        contractVersion:    CONTRACT_VERSION,
        // resultsEndpoint, offlineAllowed, bundleUrl: no se exponen al juego
        // (el host es quien llama al endpoint, no el juego)
      },
    };

    // Responder al iframe del juego.
    // SEGURIDAD (ALTO-2): cuando el origen del iframe es conocido (bundle cross-origin real),
    // usamos expectedOriginRef.current como targetOrigin para acotar el destino del mensaje.
    // Solo se cae a "*" en el caso forzado de sandbox donde event.origin === "null" (el string
    // literal "null"), porque el browser no permite pasar "null" como targetOrigin.
    // Esto es seguro porque: (a) contextResponse nunca contiene sessionToken ni JWT,
    // (b) solo el iframe cuyo contentWindow coincide con event.source puede haber enviado getContext.
    const replyOrigin = event.origin === 'null' ? '*' : expectedOriginRef.current;
    event.source.postMessage(
      { type: 'contextResponse', payload: safeContext },
      replyOrigin
    );
  }, [sessionData]);

  // ── PASO 3B: bufferizar evento del juego ──────────────────────────────────
  const handleReportEvent = useCallback((msgPayload) => {
    const { eventType, eventPayload } = msgPayload;

    if (typeof eventType !== 'string' || !eventType.trim()) {
      if (import.meta.env.DEV) {
        console.warn('[GameHost] reportEvent recibido sin eventType válido — descartado');
      }
      return;
    }

    // Validar contra catálogo (Q-EVT-3): warning pero se CONSERVA; x_ son silenciosos por contrato.
    if (!Object.values(EVENT_TYPES).includes(eventType) && !eventType.startsWith('x_')) {
      if (import.meta.env.DEV) {
        console.warn(`[GameHost] tipo de evento fuera de catálogo: "${eventType}" (custom — conservado)`);
      }
    }

    eventBuffer.current.push({
      type:      eventType,
      timestamp: new Date().toISOString(),
      payload:   eventPayload ?? {},
    });

    // Instrumentación (A.6)
    if (import.meta.env.DEV) {
      console.debug(
        `[GameHost] buffer eventos: ${eventBuffer.current.length} / cap=${EVENTS_INGEST_CAP}`
      );
      if (eventBuffer.current.length >= EVENTS_INGEST_CAP) {
        console.warn(
          `[GameHost] ATENCION: buffer alcanzó EVENTS_INGEST_CAP (${EVENTS_INGEST_CAP}). ` +
          'Reportar dato al arquitecto para recalibrar la constante.'
        );
      }
    }
  }, []);

  // ── PASO 3C: enviar resultados ─────────────────────────────────────────────
  const handleSubmitResults = useCallback(async (result) => {
    if (!sessionData) return;
    if (completedRef.current) {
      // Ya se envió — idempotencia en el cliente (R4)
      return;
    }

    setPhase(PHASE.SUBMITTING);
    completedRef.current = true;

    const durationSeconds = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current) / 1000)
      : null;

    // Payload 2.B: el host inyecta sessionToken desde su memoria.
    // El juego nunca tuvo acceso al token.
    // SEGURIDAD (ALTO-1 / Ley 21.719 minimización PII): childId NO se envía en el body.
    // El backend lo deriva del sessionToken en el servidor — el host no lo inyecta ni lo acepta del juego.
    const payload2B = {
      sessionToken:    sessionData.sessionToken,  // inyectado por el host
      assignmentId:    sessionData.assignmentId,
      activityId:      sessionData.activityId,
      rawScore:        result.rawScore,
      maxScore:        result.maxScore,
      attemptCount:    result.attemptCount ?? 1,
      durationSeconds: result.durationSeconds ?? durationSeconds,
      events:          eventBuffer.current,       // buffer del host
      metadata:        result.metadata ?? {},
      schemaVersion:   CONTRACT_VERSION,
    };

    try {
      const res = await fetch(`${API_URL}/api/activities/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // GUARDRAIL: NO se incluye Authorization header — el endpoint autentica por sessionToken en body.
        body: JSON.stringify(payload2B),
      });

      if (res.status === 201 || res.status === 200) {
        const body = await res.json().catch(() => ({}));

        // Instrumentación (A.6): datos de sesión para recalibrar cap
        if (import.meta.env.DEV) {
          console.info(
            `[GameHost] sesión completada. Eventos en buffer: ${eventBuffer.current.length}. ` +
            `resultId: ${body.resultId}`
          );
        }

        setPhase(PHASE.SUCCESS);
      } else if (res.status === 401 || res.status === 410) {
        const body = await res.json().catch(() => ({}));
        const isExpired = res.status === 410;
        setErrorMsg(
          isExpired
            ? 'La sesión expiró. Por favor vuelve al inicio y vuelve a intentarlo.'
            : body.message || 'No pudimos registrar tu actividad. Pide ayuda a un adulto.'
        );
        setPhase(PHASE.ERROR);
      } else {
        setErrorMsg('Hubo un problema al guardar tu actividad. Por favor inténtalo de nuevo.');
        setPhase(PHASE.ERROR);
      }
    } catch {
      setErrorMsg('No hay conexión. Verifica tu internet e intenta de nuevo.');
      setPhase(PHASE.ERROR);
    }
  }, [sessionData]);

  // ── Manejador central de postMessage ──────────────────────────────────────
  const handleMessage = useCallback((event) => {
    // GUARDRAIL: validar origen antes de procesar (A.4).
    //
    // Caso especial sandbox: un iframe con sandbox="allow-scripts" sin
    // "allow-same-origin" emite event.origin === "null" (el string "null"),
    // sin importar si el bundle es same-origin o cross-origin.
    // En ese caso, verificamos que el mensaje provenga del contentWindow
    // de nuestro iframe (event.source) en lugar del origen.
    //
    // Para bundles reales cross-origin (producción): event.origin debe coincidir
    // con expectedOriginRef.current y event.source con el iframe.
    const isFromOurIframe =
      iframeRef.current && event.source === iframeRef.current.contentWindow;

    if (!isFromOurIframe) {
      if (import.meta.env.DEV) {
        console.warn(
          `[GameHost] mensaje descartado: no proviene del iframe del juego ` +
          `(origen: "${event.origin}")`
        );
      }
      return;
    }

    // Para bundles cross-origin con origen conocido (no sandboxed null),
    // verificar también que el origen coincida.
    const isSandboxedNullOrigin = event.origin === 'null';
    if (!isSandboxedNullOrigin && expectedOriginRef.current && event.origin !== expectedOriginRef.current) {
      if (import.meta.env.DEV) {
        console.warn(
          `[GameHost] mensaje descartado de origen inesperado: "${event.origin}" ` +
          `(esperado: "${expectedOriginRef.current}")`
        );
      }
      return;
    }

    const { type, payload } = event.data ?? {};
    if (!type) return;

    switch (type) {
      case 'getContext':
        handleGetContext(event);
        break;
      case 'reportEvent':
        handleReportEvent(payload ?? {});
        break;
      case 'submitResults':
        handleSubmitResults(payload ?? {});
        break;
      default:
        if (import.meta.env.DEV) {
          console.debug(`[GameHost] mensaje desconocido del juego: "${type}" — ignorado`);
        }
    }
  }, [handleGetContext, handleReportEvent, handleSubmitResults]);

  // ── Ciclo de vida automático: visibilidad + foco (Q-EVT-4) ────────────────
  useEffect(() => {
    if (phase !== PHASE.PLAYING) return;

    const onVisibilityChange = () => {
      if (document.hidden) {
        pushLifecycleEvent(EVENT_TYPES.PAUSED);
      } else {
        pushLifecycleEvent(EVENT_TYPES.RESUMED);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [phase, pushLifecycleEvent]);

  // ── Registrar/desregistrar listener de postMessage ────────────────────────
  useEffect(() => {
    if (phase !== PHASE.PLAYING) return;

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [phase, handleMessage]);

  // ── abandoned al desmontar sin completar (Q-EVT-4) ───────────────────────
  useEffect(() => {
    return () => {
      if (!completedRef.current && eventBuffer.current.length >= 0 && startTimeRef.current) {
        // Solo registrar el evento en buffer (ya no se puede hacer POST aquí)
        // En una versión futura se puede usar sendBeacon para enviar el abandono.
        if (import.meta.env.DEV) {
          console.info('[GameHost] sesión abandonada sin completar.');
        }
      }
    };
  }, []);

  return {
    phase,
    bundleUrl,
    errorMsg,
    iframeRef,
    startSession,
  };
}

// ── Pantalla de carga ─────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-accent to-creative">
      <div className="bg-white/95 rounded-3xl p-12 shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full mx-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-pulse">
          <span className="text-4xl">🎮</span>
        </div>
        <h2 className="font-heading text-2xl font-bold text-text-strong text-center">
          Preparando tu actividad...
        </h2>
        <p className="font-body text-text-soft text-center text-sm">
          Un momento, ya casi empieza
        </p>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Pantalla de envío de resultados ──────────────────────────────────────────
function SubmittingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-accent to-creative">
      <div className="bg-white/95 rounded-3xl p-12 shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full mx-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-energy to-optimism flex items-center justify-center">
          <span className="text-4xl">✨</span>
        </div>
        <h2 className="font-heading text-2xl font-bold text-text-strong text-center">
          Guardando tus logros...
        </h2>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full bg-energy animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Pantalla de error (amable, sin loops) ─────────────────────────────────────
function ErrorScreen({ message, onBack }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-accent to-creative p-6">
      <div className="bg-white/95 rounded-3xl p-10 shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full text-center">
        <div className="w-20 h-20 rounded-full bg-surface flex items-center justify-center">
          <span className="text-4xl">😊</span>
        </div>
        <h2 className="font-heading text-xl font-bold text-text-strong">
          ¡Ups, algo pasó!
        </h2>
        <p className="font-body text-text-soft text-sm leading-relaxed">
          {message}
        </p>
        <button
          onClick={onBack}
          className="w-full bg-gradient-to-r from-primary to-accent text-white font-heading font-bold rounded-xl py-3 px-6 hover:opacity-90 transition"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}

// ── Pantalla de éxito / feedback lúdico ───────────────────────────────────────
// La gamificación vive AQUÍ (flujo del niño).
// Usa tokens del design system; sin neones ni glows.
function SuccessScreen({ onBack }) {
  const stars = ['⭐', '⭐', '⭐'];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-energy to-optimism p-6">
      <div className="bg-white rounded-3xl p-10 shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full text-center">
        {/* Trofeo animado */}
        <div
          className="w-28 h-28 rounded-full bg-gradient-to-br from-energy to-optimism flex items-center justify-center shadow-lg"
          style={{ animation: 'bounceIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both' }}
        >
          <span className="text-5xl" role="img" aria-label="Trofeo">🏆</span>
        </div>

        {/* Estrellas */}
        <div className="flex gap-3">
          {stars.map((star, i) => (
            <span
              key={i}
              className="text-3xl"
              style={{
                animation: `bounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.2 + i * 0.12}s both`,
                display: 'inline-block',
              }}
            >
              {star}
            </span>
          ))}
        </div>

        <h2 className="font-heading text-2xl font-bold text-text-strong">
          ¡Lo hiciste genial!
        </h2>
        <p className="font-body text-text-soft text-sm leading-relaxed">
          Completaste la actividad y tus avances quedaron guardados.
          ¡Sigue explorando!
        </p>

        <button
          onClick={onBack}
          className="w-full bg-gradient-to-r from-primary to-accent text-white font-heading font-bold rounded-xl py-3 px-6 hover:opacity-90 transition"
        >
          Volver a mis actividades
        </button>
      </div>

      {/* Confetti decorativo — solo CSS, sin librerías externas */}
      <style>{`
        @keyframes bounceIn {
          from { opacity: 0; transform: scale(0.5); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes floatDot {
          0%   { transform: translateY(0) rotate(0deg); opacity: 0.7; }
          100% { transform: translateY(-60px) rotate(45deg); opacity: 0; }
        }
      `}</style>
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10" aria-hidden>
        {[...Array(18)].map((_, i) => {
          const colors = ['#18C7D1','#4C8DFF','#FF8A3D','#FFD24A','#9A6BFF'];
          const color = colors[i % colors.length];
          const left = `${(i * 5.5 + 3) % 100}%`;
          const size = 8 + (i % 4) * 3;
          const delay = `${(i * 0.18).toFixed(2)}s`;
          const duration = `${1.2 + (i % 4) * 0.3}s`;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                bottom: '15%',
                left,
                width: size,
                height: size,
                borderRadius: i % 3 === 0 ? '50%' : '3px',
                background: color,
                animation: `floatDot ${duration} ${delay} ease-out infinite`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Componente principal GameHost ─────────────────────────────────────────────
export default function GameHost() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();

  const {
    phase,
    bundleUrl,
    errorMsg,
    iframeRef,
    startSession,
  } = useGameSession(assignmentId);

  // Arrancar sesión al montar
  useEffect(() => {
    if (assignmentId) {
      startSession();
    }
  }, [assignmentId, startSession]);

  const handleBack = () => {
    navigate('/nino');
  };

  // ── Renderizar según fase ─────────────────────────────────────────────────
  if (phase === PHASE.LOADING) return <LoadingScreen />;
  if (phase === PHASE.SUBMITTING) return <SubmittingScreen />;
  if (phase === PHASE.SUCCESS) return <SuccessScreen onBack={handleBack} />;
  if (phase === PHASE.ERROR) return <ErrorScreen message={errorMsg} onBack={handleBack} />;

  // phase === PHASE.PLAYING
  return (
    <div className="fixed inset-0 bg-text-strong flex flex-col">
      {/* Barra superior minimal con botón de salida */}
      <div className="flex items-center justify-between px-4 py-2 bg-text-strong/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-heading text-xs font-semibold text-white/70 uppercase tracking-wider">
            Actividad en curso
          </span>
        </div>
        <button
          onClick={handleBack}
          className="text-white/60 hover:text-white font-body text-sm flex items-center gap-1 transition rounded-lg px-3 py-1 hover:bg-white/10"
          aria-label="Salir de la actividad"
        >
          <span aria-hidden>←</span> Salir
        </button>
      </div>

      {/* iframe del juego — sandboxed, cross-origin */}
      <iframe
        ref={iframeRef}
        src={bundleUrl}
        title="Actividad educativa"
        className="flex-1 w-full border-0"
        /**
         * GUARDRAIL sandbox (A.4 / ALTO-2):
         *   allow-scripts  — el juego necesita ejecutar JS (SDK).
         *   allow-forms    — por si el juego incluye inputs.
         *   SIN allow-popups — los juegos-piloto MVP (drag & drop, selección 1-de-3) no
         *     necesitan abrir ventanas emergentes. Se eliminó para reducir la superficie
         *     de ataque (decisión del arquitecto — auditoría de seguridad 2026-06-09).
         *     Si un juego futuro requiere popups, elevar al arquitecto antes de añadirlo.
         *   SIN allow-same-origin → el iframe NO comparte origen con el host.
         *     Eso impide al juego acceder a localStorage, cookies o DOM del host.
         */
        sandbox="allow-scripts allow-forms"
        allow="autoplay"
        loading="eager"
        aria-label="Juego educativo"
      />
    </div>
  );
}
