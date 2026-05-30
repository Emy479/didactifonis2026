import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Al montar: hidratar desde userData almacenado (objeto completo del servidor).
  // initializing=true bloquea PrivateRoute hasta que termine la lectura de localStorage,
  // evitando la race condition que redirige a /login antes de restaurar la sesión.
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    if (token && storedUser) {
      try {
        const segments = token.split('.');
        if (segments.length !== 3) throw new Error('JWT mal formado');
        const payload = JSON.parse(atob(segments[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          throw new Error('Token expirado');
        }
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }
    setInitializing(false);
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, initializing, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
