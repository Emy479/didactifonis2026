/**
 * AuthContext.jsx — Autenticación con modelo B3 (refresh token + revocación)
 *
 * Decisiones de diseño:
 *
 * 1. ACCESS TOKEN EN MEMORIA: vive en apiFetch (_accessToken), no en
 *    localStorage. Así es inaccesible a XSS.
 *
 * 2. auth_user EN LOCALSTORAGE (solo el objeto user, no el token):
 *    El objeto user (nombre, rol, email) no es un secreto; es solo metadato
 *    de UI. Guardarlo en localStorage permite mostrar el nombre de usuario
 *    al instante durante la hidratación inicial (evita parpadeo "sin nombre")
 *    mientras la llamada a /auth/refresh resuelve en segundo plano.
 *    Si el refresh falla, se borra también. No guardamos el token aquí.
 *
 * 3. HIDRATACIÓN AL MONTAR: ya no se lee 'auth_token' de localStorage.
 *    En su lugar, se intenta POST /api/auth/refresh con credentials:'include'.
 *    Si la cookie httpOnly sigue viva → sesión restaurada sin re-login.
 *    Si no → estado no autenticado, sin romper la app.
 *    El estado `initializing:true` bloquea PrivateRoute durante ese intento.
 *
 * 4. REDIRECT DESACOPLADO: este contexto registra su función de logout en
 *    apiFetch vía setAuthFailureHandler. Cuando el refresh interceptor falla
 *    (dentro de una request de datos), apiFetch invoca el handler y este
 *    contexto hace logout limpio + navegación via React Router.
 */

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  apiFetch,
  setAccessToken,
  clearAccessToken,
  setAuthFailureHandler,
} from '../lib/apiFetch.js';
import { API_URL } from '../config.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // user: objeto con { _id, name, email, role, … } o null si no autenticado.
  // Se inicializa con lo que haya en localStorage para hidratar la UI rápido.
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // initializing: true mientras se resuelve el intento de restauración de sesión
  // al montar. PrivateRoute debe respetar este flag para no redirigir a /login
  // antes de que termine la hidratación.
  const [initializing, setInitializing] = useState(true);

  // navigate solo está disponible dentro del árbol de Router, así que usamos
  // una ref para guardarlo y accederlo desde el callback de fallo de auth.
  const navigateRef = useRef(null);

  // ── Registrar el callback de fallo de autenticación en apiFetch ────────────
  // Se llama cuando el interceptor de 401 no puede renovar el token.
  // Esto sincroniza apiFetch con el estado de React sin acoplarlo a Router.
  useEffect(() => {
    setAuthFailureHandler((path) => {
      // Limpiar estado local.
      clearAccessToken();
      localStorage.removeItem('auth_user');
      setUser(null);
      // Navegar via React Router si ya está disponible; fallback a location.
      if (navigateRef.current) {
        navigateRef.current(path, { replace: true });
      } else {
        window.location.replace(path);
      }
    });
  }, []);

  // ── Componente interno para capturar navigate (debe estar dentro de Router) ─
  // AuthProvider vive dentro de <BrowserRouter>, así que useNavigate funciona.

  // ── Hidratación al montar: intentar restaurar sesión vía cookie ───────────
  useEffect(() => {
    let cancelled = false;

    async function tryRestoreSession() {
      try {
        const res = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });

        if (cancelled) return;

        if (res.ok) {
          const data = await res.json();
          setAccessToken(data.accessToken);

          // Cargar el user desde /auth/me para tener datos frescos.
          // (El user en localStorage puede estar desactualizado.)
          try {
            const meRes = await apiFetch('/api/auth/me');
            if (!cancelled && meRes.ok) {
              const meData = await meRes.json();
              const freshUser = meData.user;
              setUser(freshUser);
              localStorage.setItem('auth_user', JSON.stringify(freshUser));
            }
          } catch {
            // Si /auth/me falla pero tenemos token, usamos el user de localStorage
            // (ya inicializado en el useState). No rompemos la sesión.
          }
        } else {
          // No hay cookie válida → limpiar cualquier residuo de localStorage
          // (puede quedar de la versión anterior del sistema).
          if (!cancelled) {
            clearAccessToken();
            localStorage.removeItem('auth_user');
            setUser(null);
          }
        }
      } catch {
        // Error de red: no interrumpir la app; quedamos como no autenticados.
        if (!cancelled) {
          clearAccessToken();
          localStorage.removeItem('auth_user');
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    }

    tryRestoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── login ──────────────────────────────────────────────────────────────────
  // Recibe los datos ya procesados desde Login.jsx (accessToken + user).
  // Login.jsx llama a apiFetch o fetch directo con credentials:'include' y
  // nos entrega el resultado; nosotros solo guardamos el estado.
  const login = (accessToken, userData) => {
    setAccessToken(accessToken);
    localStorage.setItem('auth_user', JSON.stringify(userData));
    setUser(userData);
  };

  // ── logout ─────────────────────────────────────────────────────────────────
  // 1. Avisa al servidor (revoca la sesión en BD + limpia la cookie).
  // 2. Luego limpia el estado local.
  // El endpoint es idempotente: si la cookie ya no existe devuelve 204 igual.
  const logout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Si el request falla (red, server caído), igual limpiamos localmente.
    } finally {
      clearAccessToken();
      localStorage.removeItem('auth_user');
      setUser(null);
    }
  };

  // ── Exponer navigate al ref para el callback de fallo ─────────────────────
  // Usamos un sub-componente para poder llamar useNavigate dentro del árbol.
  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, initializing, login, logout }}
    >
      <NavigateCapture navigateRef={navigateRef} />
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Componente auxiliar sin UI. Se monta dentro del Provider (que está dentro
 * de BrowserRouter) para capturar la función navigate de React Router y
 * exponerla al callback de fallo de auth de apiFetch.
 */
function NavigateCapture({ navigateRef }) {
  const navigate = useNavigate();
  navigateRef.current = navigate;
  return null;
}

export function useAuth() {
  return useContext(AuthContext);
}
