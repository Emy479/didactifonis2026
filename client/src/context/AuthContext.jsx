import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // Al montar: hidratar desde userData almacenado (objeto completo del servidor).
  // No se decodifica el JWT porque el payload solo contiene { id, role, iat, exp }
  // y los dashboards necesitan name, email, subscription, etc.
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    if (token && storedUser) {
      try {
        // Validar que el token no esté expirado antes de restaurar la sesión
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
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
