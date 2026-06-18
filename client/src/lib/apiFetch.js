/**
 * apiFetch.js — Cliente HTTP central de Didactifonis
 *
 * Responsabilidades:
 *  1. Mantener el access token EN MEMORIA (nunca en localStorage).
 *  2. Inyectar Authorization: Bearer <accessToken> en cada request protegido.
 *  3. Refresh-on-401: un único intento de renovación; si falla → logout + redirect.
 *  4. Evitar N refreshes en paralelo usando una promesa compartida.
 *
 * Decisión de redirect:
 *  Se usa un callback `onAuthFailure` que AuthContext registra con
 *  `setAuthFailureHandler()`. Esto desacopla apiFetch de React Router
 *  (no importa `useNavigate` aquí) y evita un `window.location.href` abrupto
 *  que fuerza recarga completa. AuthContext llama a su propio `logout` local
 *  y luego hace la navegación via el router. Como fallback (callback no
 *  registrado aún durante hidratación inicial) se usa `window.location.replace`.
 */

import { API_URL } from '../config.js';

// ── Almacenamiento del access token en memoria ────────────────────────────────

let _accessToken = null;

export function setAccessToken(token) {
  _accessToken = token;
}

export function getAccessToken() {
  return _accessToken;
}

export function clearAccessToken() {
  _accessToken = null;
}

// ── Callback de fallo de autenticación (registrado por AuthContext) ───────────

let _onAuthFailure = null;

/**
 * AuthContext llama a esto al montarse para registrar su función de logout.
 * La función recibe el path de destino como argumento.
 * @param {(path: string) => void} handler
 */
export function setAuthFailureHandler(handler) {
  _onAuthFailure = handler;
}

function handleAuthFailure() {
  clearAccessToken();
  if (typeof _onAuthFailure === 'function') {
    _onAuthFailure('/login');
  } else {
    // Fallback si el handler aún no fue registrado (ej. durante hydration).
    window.location.replace('/login');
  }
}

// ── Control de refresh concurrente ───────────────────────────────────────────
// Si varias llamadas fallan con 401 a la vez, solo una dispara el refresh.
// Las demás esperan la misma promesa para no rotar el token N veces.

let _refreshPromise = null;

async function doRefresh() {
  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include', // envía la cookie httpOnly refresh_token
  });

  if (!res.ok) {
    // El backend devuelve 401 en cualquier caso de fallo (sin cookie,
    // inválido, expirado, o reuso de token). Ante eso: logout global.
    handleAuthFailure();
    throw new Error('refresh_failed');
  }

  const data = await res.json();
  setAccessToken(data.accessToken);
  return data.accessToken;
}

function refreshOnce() {
  if (!_refreshPromise) {
    _refreshPromise = doRefresh().finally(() => {
      // Limpiar la promesa compartida una vez que resuelve o rechaza,
      // para que el próximo ciclo de 401 pueda iniciar un nuevo refresh.
      _refreshPromise = null;
    });
  }
  return _refreshPromise;
}

// ── apiFetch — función principal ──────────────────────────────────────────────

/**
 * Wrapper de fetch que:
 *  - Construye la URL absoluta usando API_URL.
 *  - Inyecta Authorization: Bearer <token> si hay access token en memoria.
 *  - Ante 401: intenta refresh una sola vez y reintenta el request original.
 *  - Ante fallo de refresh: llama handleAuthFailure y lanza un error.
 *
 * Las rutas de auth (/api/auth/*) necesitan `credentials:'include'` para que
 * el navegador adjunte la cookie refresh_token (Path=/api/auth). Para el
 * resto de la API no hace falta (el access token viaja en el header).
 * El llamador puede pasar `credentials:'include'` explícitamente si lo necesita;
 * de lo contrario se usa `'same-origin'` como valor por defecto del navegador.
 *
 * @param {string} path          Ruta relativa, p.ej. '/api/users/me'
 * @param {RequestInit} options  Opciones nativas de fetch (method, body, headers…)
 * @returns {Promise<Response>}
 */
export async function apiFetch(path, options = {}) {
  const url = `${API_URL}${path}`;

  // Construir headers: inyectar Bearer si hay access token.
  const headers = {
    ...options.headers,
  };
  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  const init = { ...options, headers };

  let response = await fetch(url, init);

  // Si no es 401, devolver tal cual (éxito o cualquier otro error no-auth).
  if (response.status !== 401) {
    return response;
  }

  // ── 401: intentar renovar el access token una sola vez ───────────────────
  try {
    await refreshOnce();
  } catch {
    // refreshOnce ya llamó handleAuthFailure y lanzó 'refresh_failed'.
    // Relanzar para que el llamador sepa que la request no se completó.
    throw new Error('Session expired. Redirecting to login.');
  }

  // Reintentar el request original con el nuevo access token.
  const retryHeaders = {
    ...options.headers,
    Authorization: `Bearer ${_accessToken}`,
  };

  response = await fetch(url, { ...options, headers: retryHeaders });
  return response;
}
